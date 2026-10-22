import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gestores, mensagensWhatsapp } from "@/db/schema";
import { exigirEdicao } from "@/lib/auth";
import { badRequest, baseUrlFrom, json, notFound, serverError } from "@/lib/api";
import {
  cloudApiConfigurada,
  descricaoProvedorAtivo,
  linkWhatsApp,
  montarMensagem,
  normalizarTelefone,
  provedorAtivo,
  type FinalidadeKey,
} from "@/lib/whatsapp";
import { enviarPorProvedor } from "@/lib/whatsapp-providers";
import { obterCompromisso, registrarAuditoria, listarMensagens } from "@/lib/repo";
import { FINALIDADES_KEYS } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Lista as comunicações registradas (histórico de mensagens por compromisso). */
export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const compromissoId = Number(params.get("compromissoId"));
    const itens = await listarMensagens({
      compromissoId: Number.isFinite(compromissoId) && compromissoId > 0 ? compromissoId : undefined,
      status: params.get("status") ?? undefined,
      finalidade: params.get("finalidade") ?? undefined,
      limite: Number(params.get("limite")) || 60,
    });
    return json({
      ok: true,
      total: itens.length,
      apiAutomaticaConfigurada: cloudApiConfigurada(),
      provedor: descricaoProvedorAtivo(),
      itens,
    });
  } catch (error) {
    console.error("GET /api/whatsapp", error);
    return serverError();
  }
}

/**
 * Gera (e opcionalmente envia) a mensagem de WhatsApp para o responsável pelo
 * compromisso. Sem credenciais da WhatsApp Cloud API, devolve o link wa.me
 * pronto para envio; o registro fica salvo no banco para auditoria.
 */
export async function POST(request: NextRequest) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;
    const body = (await request.json()) as {
      compromissoId?: number;
      gestorId?: number | null;
      telefone?: string;
      destinoNome?: string;
      finalidade?: string;
      mensagem?: string;
      enviar?: boolean;
      registrar?: boolean;
    };

    const compromissoId = Number(body.compromissoId);
    if (!Number.isFinite(compromissoId) || compromissoId <= 0) {
      return badRequest("Compromisso inválido para envio de mensagem.");
    }

    const compromisso = await obterCompromisso(compromissoId);
    if (!compromisso) return notFound("Compromisso não encontrado.");

    const finalidade = (
      (FINALIDADES_KEYS as readonly string[]).includes(body.finalidade ?? "")
        ? body.finalidade
        : "CONVITE"
    ) as FinalidadeKey;

    // Define destinatário: gestor informado, gestor vinculado ao compromisso
    // ou telefone avulso informado manualmente.
    let destinoNome = body.destinoNome?.trim() ?? "";
    let telefone = body.telefone?.trim() ?? "";
    let gestorId: number | null = body.gestorId ?? null;

    const idParaBuscar = body.gestorId ?? compromisso.gestorId ?? null;
    if (idParaBuscar) {
      const encontrado = await db
        .select()
        .from(gestores)
        .where(eq(gestores.id, idParaBuscar))
        .limit(1);
      const gestor = encontrado[0];
      if (body.gestorId && !gestor) return notFound("Gestor não encontrado.");
      if (gestor) {
        gestorId = gestor.id;
        destinoNome = destinoNome || gestor.nome;
        telefone = telefone || (gestor.telefone ?? "");
      }
    }

    if (!destinoNome) {
      destinoNome = compromisso.gestorNome ?? "Equipe de gestão";
    }
    if (!telefone) {
      telefone = compromisso.gestorTelefone ?? "";
    }

    const numero = normalizarTelefone(telefone);
    if (!numero) {
      return badRequest(
        "Telefone inválido ou não cadastrado. Informe DDD + número (ex.: (11) 98812-4477) no cadastro do gestor.",
      );
    }

    const baseUrl = baseUrlFrom(request);
    const mensagem =
      body.mensagem?.trim() ||
      montarMensagem(
        {
          id: compromisso.id,
          titulo: compromisso.titulo,
          tipo: compromisso.tipo,
          assunto: compromisso.assunto,
          descricao: compromisso.descricao,
          cargoResponsavel: compromisso.cargoResponsavel,
          responsavel: compromisso.gestorNome,
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
        destinoNome,
      );

    const link = linkWhatsApp(numero, mensagem);

    // Envio automático quando a Cloud API estiver configurada e solicitado.
    let canal: "LINK" | "API" = "LINK";
    let status = "GERADO";
    let erro: string | null = null;

    if (body.enviar && provedorAtivo()) {
      const resultado = await enviarPorProvedor(numero, mensagem);
      canal = resultado.canal;
      if (resultado.enviado) {
        status = "ENVIADO";
      } else {
        status = "FALHA";
        erro = resultado.erro ?? "Falha no envio automático.";
      }
    }

    if (body.registrar === false) {
      return json({
        ok: true,
        registro: null,
        link,
        mensagem,
        canal,
        status,
        automatico: cloudApiConfigurada(),
        telefone: numero,
      });
    }

    const [registro] = await db
      .insert(mensagensWhatsapp)
      .values({
        compromissoId: compromisso.id,
        gestorId,
        destinoNome,
        destinoTelefone: numero,
        finalidade,
        mensagem,
        canal,
        status,
        erro,
        enviadoEm: status === "ENVIADO" ? new Date() : null,
      })
      .returning();

    await registrarAuditoria({
      entidade: "mensagem_whatsapp",
      entidadeId: registro?.id ?? null,
      acao: status === "ENVIADO" ? "ENVIAR_WHATSAPP" : "GERAR_WHATSAPP",
      detalhe: `Mensagem ${finalidade} para ${destinoNome} (${numero}) sobre "${compromisso.titulo}" — ${
        status === "ENVIADO" ? "enviada pela API" : "gerada para envio manual"
      }.`,
    });

    return json({
      ok: true,
      registro,
      link,
      mensagem,
      canal,
      status,
      erro,
      automatico: cloudApiConfigurada(),
      telefone: numero,
    });
  } catch (error) {
    console.error("POST /api/whatsapp", error);
    return serverError();
  }
}
