import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  compromissoProfessores,
  compromissos,
  gestores,
  mensagensWhatsapp,
  professores,
} from "@/db/schema";
import { registrarAuditoria } from "./repo";
import {
  addDays,
  duracaoMinutos,
  isoToday,
  toLocalDate,
} from "./datetime";
import {
  envioAutomaticoAlteracao,
  envioAutomaticoConvite,
  janelaAposInicioMinutos,
  montarMensagem,
  provedorAtivo,
  type FinalidadeKey,
} from "./whatsapp";
import { enviarPorProvedor } from "./whatsapp-providers";

export type DetalheDisparo = {
  compromissoId: number;
  titulo: string;
  finalidade: FinalidadeKey;
  destino: string | null;
  telefone: string | null;
  status: "ENVIADO" | "FALHA" | "IGNORADO";
  motivo?: string;
  idMensagem?: string;
};

export type ResultadoDisparo = {
  executadoEm: string;
  provedor: string | null;
  automatico: boolean;
  origem: string;
  simulacao: boolean;
  convitesEnviados: number;
  lembretesEnviados: number;
  alteracoesEnviadas: number;
  falhas: number;
  ignorados: number;
  pendentes: number;
  detalhes: DetalheDisparo[];
};

const STATUS_ATIVOS = ["AGENDADO", "CONFIRMADO", "EM_ANDAMENTO", "ADIADO"] as const;

/**
 * DISPARO AUTOMÁTICO NO SERVIDOR
 * Verifica os compromissos e envia, sem intervenção humana:
 *  - CONVITE (quando WHATSAPP_AUTO_CONVITE=true e ainda não houve convite);
 *  - ALTERACAO (quando o compromisso foi editado após o convite);
 *  - LEMBRETE (na antecedência do despertador de cada compromisso).
 * Deduplicação garantida pela tabela mensagens_whatsapp.
 */
export async function executarDisparoAutomatico(opcoes: {
  origem?: string;
  simulacao?: boolean;
  somente?: "convites" | "lembretes" | "todos";
  baseUrl?: string;
} = {}): Promise<ResultadoDisparo> {
  const origem = opcoes.origem ?? "manual";
  const simulacao = opcoes.simulacao ?? false;
  const somente = opcoes.somente ?? "todos";
  const baseUrl = (opcoes.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  const provedor = provedorAtivo();
  const agora = new Date();
  const hoje = isoToday();
  const janela = janelaAposInicioMinutos();

  const detalhes: DetalheDisparo[] = [];
  let convitesEnviados = 0;
  let lembretesEnviados = 0;
  let alteracoesEnviadas = 0;
  let falhas = 0;
  let ignorados = 0;
  let pendentes = 0;

  const candidatos = await db
    .select({
      compromisso: compromissos,
      gestorNome: gestores.nome,
      gestorTelefone: gestores.telefone,
    })
    .from(compromissos)
    .leftJoin(gestores, eq(compromissos.gestorId, gestores.id))
    .where(
      and(
        eq(compromissos.despertadorAtivo, true),
        inArray(compromissos.status, [...STATUS_ATIVOS]),
        gte(compromissos.dataFim, addDays(hoje, -1)),
        lte(compromissos.dataInicio, addDays(hoje, 8)),
      ),
    )
    .orderBy(compromissos.dataInicio, compromissos.horaInicio)
    .limit(200);

  if (candidatos.length === 0) {
    return {
      executadoEm: agora.toISOString(),
      provedor,
      automatico: Boolean(provedor),
      origem,
      simulacao,
      convitesEnviados: 0,
      lembretesEnviados: 0,
      alteracoesEnviadas: 0,
      falhas: 0,
      ignorados: 0,
      pendentes: 0,
      detalhes,
    };
  }

  const ids = candidatos.map((c) => c.compromisso.id);
  const enviadas = await db
    .select()
    .from(mensagensWhatsapp)
    .where(
      and(
        inArray(mensagensWhatsapp.compromissoId, ids),
        eq(mensagensWhatsapp.status, "ENVIADO"),
      ),
    )
    .orderBy(desc(mensagensWhatsapp.criadoEm));

  // Professores convocados em cada compromisso (agenda docente)
  const convocacoes = ids.length
    ? await db
        .select({
          compromissoId: compromissoProfessores.compromissoId,
          professorId: professores.id,
          nome: professores.nome,
          telefone: professores.telefone,
          disciplina: professores.disciplina,
          turmas: professores.turmas,
        })
        .from(compromissoProfessores)
        .innerJoin(professores, eq(compromissoProfessores.professorId, professores.id))
        .where(
          and(
            inArray(compromissoProfessores.compromissoId, ids),
            eq(professores.ativo, true),
          ),
        )
    : [];

  const docentesDo = (compromissoId: number) =>
    convocacoes.filter((c) => c.compromissoId === compromissoId);

  const jaEnviadoParaProfessor = (compromissoId: number, professorId: number, finalidade: string) =>
    enviadas.some(
      (m) =>
        m.compromissoId === compromissoId &&
        m.professorId === professorId &&
        m.finalidade === finalidade,
    );

  const ultimaEnviada = (id: number, finalidade: FinalidadeKey) =>
    enviadas.find((m) => m.compromissoId === id && m.finalidade === finalidade) ?? null;

  const registrar = async (entrada: {
    compromissoId: number;
    gestorId: number | null;
    professorId?: number | null;
    destino: string;
    telefone: string;
    finalidade: FinalidadeKey;
    mensagem: string;
    enviado: boolean;
    erro?: string;
    idMensagem?: string;
  }) => {
    const [registro] = await db
      .insert(mensagensWhatsapp)
      .values({
        compromissoId: entrada.compromissoId,
        gestorId: entrada.gestorId,
        professorId: entrada.professorId ?? null,
        destinoNome: entrada.destino,
        destinoTelefone: entrada.telefone,
        finalidade: entrada.finalidade,
        mensagem: entrada.mensagem,
        canal: "API",
        status: entrada.enviado ? "ENVIADO" : "FALHA",
        erro: entrada.erro ?? null,
        enviadoEm: entrada.enviado ? new Date() : null,
      })
      .returning();
    return registro;
  };

  for (const { compromisso, gestorNome, gestorTelefone } of candidatos) {
    const destino = gestorNome ?? "Equipe de gestão";
    const telefone = gestorTelefone ?? null;
    const inicio = toLocalDate(compromisso.dataInicio, compromisso.horaInicio);
    const fim = new Date(
      inicio.getTime() + duracaoMinutos(
        compromisso.dataInicio,
        compromisso.dataFim,
        compromisso.horaInicio,
        compromisso.horaFim,
      ) * 60000,
    );
    const alerta = new Date(inicio.getTime() - compromisso.lembreteMinutos * 60000);

    const modelo = (finalidade: FinalidadeKey) =>
      montarMensagem(
        {
          id: compromisso.id,
          titulo: compromisso.titulo,
          tipo: compromisso.tipo,
          assunto: compromisso.assunto,
          descricao: compromisso.descricao,
          cargoResponsavel: compromisso.cargoResponsavel,
          responsavel: gestorNome,
          local: compromisso.local,
          dataInicio: compromisso.dataInicio,
          dataFim: compromisso.dataFim,
          horaInicio: compromisso.horaInicio,
          horaFim: compromisso.horaFim,
          participantes: compromisso.participantes,
          status: compromisso.status,
          prioridade: compromisso.prioridade,
          lembreteMinutos: compromisso.lembreteMinutos,
        },
        finalidade,
        baseUrl,
        destino,
      );

    const enviar = async (finalidade: FinalidadeKey) => {
      const mensagem = modelo(finalidade);

      if (!telefone) {
        ignorados += 1;
        detalhes.push({
          compromissoId: compromisso.id,
          titulo: compromisso.titulo,
          finalidade,
          destino,
          telefone: null,
          status: "IGNORADO",
          motivo: "Responsável sem telefone cadastrado (cadastre em Gestores).",
        });
        return;
      }

      if (!provedor) {
        pendentes += 1;
        detalhes.push({
          compromissoId: compromisso.id,
          titulo: compromisso.titulo,
          finalidade,
          destino,
          telefone,
          status: "IGNORADO",
          motivo: "Nenhum provedor de API do WhatsApp configurado (disparo automático desligado).",
        });
        return;
      }

      if (simulacao) {
        detalhes.push({
          compromissoId: compromisso.id,
          titulo: compromisso.titulo,
          finalidade,
          destino,
          telefone,
          status: "IGNORADO",
          motivo: "Simulação — nenhuma mensagem foi enviada.",
        });
        return;
      }

      const resultado = await enviarPorProvedor(telefone, mensagem, provedor);
      await registrar({
        compromissoId: compromisso.id,
        gestorId: compromisso.gestorId,
        destino,
        telefone,
        finalidade,
        mensagem,
        enviado: resultado.enviado,
        erro: resultado.erro,
        idMensagem: resultado.idMensagem,
      });

      if (resultado.enviado) {
        if (finalidade === "LEMBRETE") lembretesEnviados += 1;
        else if (finalidade === "CONVITE") convitesEnviados += 1;
        else alteracoesEnviadas += 1;
      } else {
        falhas += 1;
      }

      detalhes.push({
        compromissoId: compromisso.id,
        titulo: compromisso.titulo,
        finalidade,
        destino,
        telefone,
        status: resultado.enviado ? "ENVIADO" : "FALHA",
        motivo: resultado.erro,
        idMensagem: resultado.idMensagem,
      });
    };

    // 1) LEMBRETE do despertador (na antecedência configurada)
    let lembreteDisparadoNesteCiclo = false;
    if (somente === "todos" || somente === "lembretes") {
      const jaLembrou = Boolean(ultimaEnviada(compromisso.id, "LEMBRETE"));
      const dentroDaJanela = agora >= alerta && agora <= new Date(fim.getTime() + janela * 60000);
      if (!jaLembrou && dentroDaJanela) {
        await enviar("LEMBRETE");
        lembreteDisparadoNesteCiclo = true;
      } else if (!jaLembrou && agora < alerta) {
        pendentes += 1;
      }
    }

    // 2) CONVITE automático + 3) ALTERACAO após edição
    let conviteOuAlteracao: FinalidadeKey | null = null;
    if (somente === "todos" || somente === "convites") {
      const convite = ultimaEnviada(compromisso.id, "CONVITE");
      if (!convite && envioAutomaticoConvite()) {
        await enviar("CONVITE");
        conviteOuAlteracao = "CONVITE";
      } else if (convite && envioAutomaticoAlteracao()) {
        const alteradoDepois =
          compromisso.atualizadoEm.getTime() > convite.criadoEm.getTime() + 60000;
        const jaAvisou = ultimaEnviada(compromisso.id, "ALTERACAO");
        const alteracaoMaisRecente =
          !jaAvisou || jaAvisou.criadoEm.getTime() < compromisso.atualizadoEm.getTime();
        if (alteradoDepois && alteracaoMaisRecente) {
          await enviar("ALTERACAO");
          conviteOuAlteracao = "ALTERACAO";
        }
      }
    }

    // 4) PROFESSORES CONVOCADOS — aviso individual na agenda docente
    const finalidadeDocente = conviteOuAlteracao ?? "CONVITE";
    for (const docente of docentesDo(compromisso.id)) {
      if (jaEnviadoParaProfessor(compromisso.id, docente.professorId, finalidadeDocente)) continue;

      const mensagemDocente = modelo(finalidadeDocente).replace(
        /^Olá, .*?!$/m,
        `Olá, ${docente.nome.split(" ")[0]}!`,
      );

      if (!docente.telefone) {
        ignorados += 1;
        detalhes.push({
          compromissoId: compromisso.id,
          titulo: compromisso.titulo,
          finalidade: finalidadeDocente,
          destino: `${docente.nome} (professor)`,
          telefone: null,
          status: "IGNORADO",
          motivo: "Professor sem WhatsApp cadastrado (cadastre em Professores).",
        });
        continue;
      }

      if (!provedor || simulacao) {
        pendentes += provedor ? 0 : 1;
        detalhes.push({
          compromissoId: compromisso.id,
          titulo: compromisso.titulo,
          finalidade: finalidadeDocente,
          destino: `${docente.nome} (professor)`,
          telefone: docente.telefone,
          status: "IGNORADO",
          motivo: simulacao
            ? "Simulação — nenhuma mensagem foi enviada."
            : "Nenhum provedor de API do WhatsApp configurado.",
        });
        continue;
      }

      const resultadoDocente = await enviarPorProvedor(
        docente.telefone,
        mensagemDocente,
        provedor,
      );
      await registrar({
        compromissoId: compromisso.id,
        gestorId: null,
        professorId: docente.professorId,
        destino: `${docente.nome} — professor(a)`,
        telefone: docente.telefone,
        finalidade: finalidadeDocente,
        mensagem: mensagemDocente,
        enviado: resultadoDocente.enviado,
        erro: resultadoDocente.erro,
        idMensagem: resultadoDocente.idMensagem,
      });

      if (resultadoDocente.enviado) {
        if (finalidadeDocente === "ALTERACAO") alteracoesEnviadas += 1;
        else convitesEnviados += 1;
      } else {
        falhas += 1;
      }

      detalhes.push({
        compromissoId: compromisso.id,
        titulo: compromisso.titulo,
        finalidade: finalidadeDocente,
        destino: `${docente.nome} (professor)`,
        telefone: docente.telefone,
        status: resultadoDocente.enviado ? "ENVIADO" : "FALHA",
        motivo: resultadoDocente.erro,
        idMensagem: resultadoDocente.idMensagem,
      });
    }

    // 5) LEMBRETE também para os professores convocados
    const lembreteResponsavel =
      lembreteDisparadoNesteCiclo || Boolean(ultimaEnviada(compromisso.id, "LEMBRETE"));
    if ((somente === "todos" || somente === "lembretes") && lembreteResponsavel) {
      for (const docente of docentesDo(compromisso.id)) {
        if (!docente.telefone) continue;
        if (jaEnviadoParaProfessor(compromisso.id, docente.professorId, "LEMBRETE")) continue;

        const mensagemLembrete = modelo("LEMBRETE").replace(
          /^Olá, .*?!$/m,
          `Olá, ${docente.nome.split(" ")[0]}!`,
        );

        if (!provedor || simulacao) {
          detalhes.push({
            compromissoId: compromisso.id,
            titulo: compromisso.titulo,
            finalidade: "LEMBRETE",
            destino: `${docente.nome} (professor)`,
            telefone: docente.telefone,
            status: "IGNORADO",
            motivo: simulacao
              ? "Simulação — nenhuma mensagem foi enviada."
              : "Nenhum provedor de API do WhatsApp configurado.",
          });
          continue;
        }

        const resultadoLembrete = await enviarPorProvedor(
          docente.telefone,
          mensagemLembrete,
          provedor,
        );
        await registrar({
          compromissoId: compromisso.id,
          gestorId: null,
          professorId: docente.professorId,
          destino: `${docente.nome} — professor(a)`,
          telefone: docente.telefone,
          finalidade: "LEMBRETE",
          mensagem: mensagemLembrete,
          enviado: resultadoLembrete.enviado,
          erro: resultadoLembrete.erro,
          idMensagem: resultadoLembrete.idMensagem,
        });

        if (resultadoLembrete.enviado) lembretesEnviados += 1;
        else falhas += 1;

        detalhes.push({
          compromissoId: compromisso.id,
          titulo: compromisso.titulo,
          finalidade: "LEMBRETE",
          destino: `${docente.nome} (professor)`,
          telefone: docente.telefone,
          status: resultadoLembrete.enviado ? "ENVIADO" : "FALHA",
          motivo: resultadoLembrete.erro,
          idMensagem: resultadoLembrete.idMensagem,
        });
      }
    }
  }

  const enviadosTotal = convitesEnviados + lembretesEnviados + alteracoesEnviadas;

  if (!simulacao && enviadosTotal + falhas > 0) {
    await registrarAuditoria({
      entidade: "disparo_whatsapp",
      entidadeId: null,
      acao: "DISPARO_AUTOMATICO",
      detalhe: `Disparo automático (${origem}): ${convitesEnviados} convite(s), ${lembretesEnviados} lembrete(s), ${alteracoesEnviadas} alteração(ões), ${falhas} falha(s) via ${provedor}.`,
    });
  }

  return {
    executadoEm: agora.toISOString(),
    provedor,
    automatico: Boolean(provedor),
    origem,
    simulacao,
    convitesEnviados,
    lembretesEnviados,
    alteracoesEnviadas,
    falhas,
    ignorados,
    pendentes,
    detalhes: detalhes.slice(0, 60),
  };
}

/** Envia o convite imediato aos professores convocados (usado ao agendar). */
export async function enviarConvitesAosProfessores(
  compromissoId: number,
  baseUrl: string,
): Promise<{ enviados: number; ignorados: number; detalhes: string[] }> {
  const provedor = provedorAtivo();
  const base = baseUrl.replace(/\/+$/, "");

  const linhas = await db
    .select({
      compromisso: compromissos,
      gestorNome: gestores.nome,
      professor: professores,
    })
    .from(compromissoProfessores)
    .innerJoin(compromissos, eq(compromissoProfessores.compromissoId, compromissos.id))
    .innerJoin(professores, eq(compromissoProfessores.professorId, professores.id))
    .leftJoin(gestores, eq(compromissos.gestorId, gestores.id))
    .where(
      and(eq(compromissoProfessores.compromissoId, compromissoId), eq(professores.ativo, true)),
    );

  const detalhes: string[] = [];
  let enviados = 0;
  let ignorados = 0;

  for (const linha of linhas) {
    const { compromisso, gestorNome, professor } = linha;
    if (!professor.telefone) {
      ignorados += 1;
      detalhes.push(`${professor.nome}: sem WhatsApp cadastrado.`);
      continue;
    }
    if (!provedor) {
      ignorados += 1;
      detalhes.push(`${professor.nome}: nenhum provedor configurado.`);
      continue;
    }

    const mensagem = montarMensagem(
      {
        id: compromisso.id,
        titulo: compromisso.titulo,
        tipo: compromisso.tipo,
        assunto: compromisso.assunto,
        descricao: compromisso.descricao,
        cargoResponsavel: compromisso.cargoResponsavel,
        responsavel: gestorNome,
        local: compromisso.local,
        dataInicio: compromisso.dataInicio,
        dataFim: compromisso.dataFim,
        horaInicio: compromisso.horaInicio,
        horaFim: compromisso.horaFim,
        participantes: compromisso.participantes,
        status: compromisso.status,
        prioridade: compromisso.prioridade,
        lembreteMinutos: compromisso.lembreteMinutos,
      },
      "CONVITE",
      base,
      professor.nome,
    );

    const resultado = await enviarPorProvedor(professor.telefone, mensagem, provedor);
    await db.insert(mensagensWhatsapp).values({
      compromissoId: compromisso.id,
      gestorId: null,
      professorId: professor.id,
      destinoNome: `${professor.nome} — professor(a)`,
      destinoTelefone: professor.telefone,
      finalidade: "CONVITE",
      mensagem,
      canal: "API",
      status: resultado.enviado ? "ENVIADO" : "FALHA",
      erro: resultado.erro ?? null,
      enviadoEm: resultado.enviado ? new Date() : null,
    });

    if (resultado.enviado) {
      enviados += 1;
      detalhes.push(`${professor.nome}: convite enviado.`);
    } else {
      detalhes.push(`${professor.nome}: falha — ${resultado.erro}.`);
    }
  }

  if (enviados > 0) {
    await registrarAuditoria({
      entidade: "compromisso",
      entidadeId: compromissoId,
      acao: "CONVITE_DOCENTES",
      detalhe: `Convite de agenda enviado automaticamente a ${enviados} professor(es) convocado(s).`,
    });
  }

  return { enviados, ignorados, detalhes };
}

/** Envia o convite automático de um compromisso específico (usado ao agendar). */
export async function enviarConviteDoCompromisso(
  compromissoId: number,
  baseUrl: string,
): Promise<{ enviado: boolean; erro?: string; telefone?: string | null }> {
  const provedor = provedorAtivo();
  const linhas = await db
    .select({
      compromisso: compromissos,
      gestorNome: gestores.nome,
      gestorTelefone: gestores.telefone,
    })
    .from(compromissos)
    .leftJoin(gestores, eq(compromissos.gestorId, gestores.id))
    .where(eq(compromissos.id, compromissoId))
    .limit(1);

  const linha = linhas[0];
  if (!linha) return { enviado: false, erro: "Compromisso não encontrado." };

  const { compromisso, gestorNome, gestorTelefone } = linha;
  if (!gestorTelefone) {
    return {
      enviado: false,
      telefone: null,
      erro:
        "O responsável não tem telefone cadastrado. Cadastre em Gestores para o envio automático.",
    };
  }
  if (!provedor) {
    return {
      enviado: false,
      telefone: gestorTelefone,
      erro:
        "Nenhum provedor de API do WhatsApp configurado. Configure em Banco de Dados para o disparo automático.",
    };
  }

  const destino = gestorNome ?? "Equipe de gestão";
  const mensagem = montarMensagem(
    {
      id: compromisso.id,
      titulo: compromisso.titulo,
      tipo: compromisso.tipo,
      assunto: compromisso.assunto,
      descricao: compromisso.descricao,
      cargoResponsavel: compromisso.cargoResponsavel,
      responsavel: gestorNome,
      local: compromisso.local,
      dataInicio: compromisso.dataInicio,
      dataFim: compromisso.dataFim,
      horaInicio: compromisso.horaInicio,
      horaFim: compromisso.horaFim,
      participantes: compromisso.participantes,
      status: compromisso.status,
      prioridade: compromisso.prioridade,
      lembreteMinutos: compromisso.lembreteMinutos,
    },
    "CONVITE",
    baseUrl.replace(/\/+$/, ""),
    destino,
  );

  const resultado = await enviarPorProvedor(gestorTelefone, mensagem, provedor);
  await db.insert(mensagensWhatsapp).values({
    compromissoId: compromisso.id,
    gestorId: compromisso.gestorId,
    destinoNome: destino,
    destinoTelefone: gestorTelefone,
    finalidade: "CONVITE",
    mensagem,
    canal: "API",
    status: resultado.enviado ? "ENVIADO" : "FALHA",
    erro: resultado.erro ?? null,
    enviadoEm: resultado.enviado ? new Date() : null,
  });

  await registrarAuditoria({
    entidade: "compromisso",
    entidadeId: compromisso.id,
    acao: resultado.enviado ? "CONVITE_AUTOMATICO" : "CONVITE_FALHA",
    detalhe: resultado.enviado
      ? `Convite automático enviado por WhatsApp a ${destino} (${gestorTelefone}).`
      : `Falha no convite automático para ${destino}: ${resultado.erro}.`,
  });

  return { enviado: resultado.enviado, erro: resultado.erro, telefone: gestorTelefone };
}
