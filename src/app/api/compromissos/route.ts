import type { NextRequest } from "next/server";
import { db } from "@/db";
import { compromissos } from "@/db/schema";
import { exigirEdicao } from "@/lib/auth";
import { badRequest, baseUrlFrom, filtrosFromParams, json, serverError } from "@/lib/api";
import { registrarAuditoria, listarCompromissos } from "@/lib/repo";
import {
  enviarConviteDoCompromisso,
  enviarConvitesAosProfessores,
} from "@/lib/whatsapp-disparo";
import { definirProfessoresDoCompromisso } from "@/lib/repo";
import { envioAutomaticoConvite } from "@/lib/whatsapp";
import { compromissoSchema, firstError, normalizeOptional } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const filtros = filtrosFromParams(new URL(request.url).searchParams);
    const itens = await listarCompromissos(filtros);
    return json({ ok: true, total: itens.length, itens });
  } catch (error) {
    console.error("GET /api/compromissos", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = compromissoSchema.safeParse(body);
    if (!parsed.success) return badRequest(firstError(parsed.error));
    const dados = parsed.data;
    const pediuConvite = body.enviarConvite === true;

    const [criado] = await db
      .insert(compromissos)
      .values({
        titulo: dados.titulo,
        tipo: dados.tipo,
        assunto: dados.assunto,
        descricao: normalizeOptional(dados.descricao),
        cargoResponsavel: dados.cargoResponsavel,
        gestorId: dados.gestorId ?? null,
        dataInicio: dados.dataInicio,
        dataFim: dados.dataFim,
        horaInicio: dados.horaInicio,
        horaFim: dados.horaFim,
        local: dados.local,
        participantes: normalizeOptional(dados.participantes),
        prioridade: dados.prioridade,
        status: dados.status,
        lembreteMinutos: dados.lembreteMinutos,
        despertadorAtivo: dados.despertadorAtivo,
      })
      .returning();

    // Convocações de professores (agenda do professor)
    let convocacoes = 0;
    if (criado && dados.professorIds && dados.professorIds.length > 0) {
      const resultado = await definirProfessoresDoCompromisso(criado.id, dados.professorIds);
      convocacoes = resultado.adicionados;
    }

    await registrarAuditoria({
      entidade: "compromisso",
      entidadeId: criado?.id ?? null,
      acao: "CRIAR",
      detalhe: `Compromisso "${dados.titulo}" agendado para ${dados.dataInicio} ${dados.horaInicio} em ${dados.local}${
        convocacoes > 0 ? ` · ${convocacoes} professor(es) convocado(s)` : ""
      }.`,
    });

    // Convite automático por WhatsApp assim que o compromisso é agendado.
    let convite: { tentado: boolean; enviado: boolean; erro?: string } | null = null;
    let docentes: { enviados: number; ignorados: number } | null = null;
    if (pediuConvite && criado) {
      const base = baseUrlFrom(request);
      const resultado = await enviarConviteDoCompromisso(criado.id, base);
      convite = { tentado: true, enviado: resultado.enviado, erro: resultado.erro };
      const paraDocentes = await enviarConvitesAosProfessores(criado.id, base);
      docentes = { enviados: paraDocentes.enviados, ignorados: paraDocentes.ignorados };
    } else if (criado && envioAutomaticoConvite()) {
      const paraDocentes = await enviarConvitesAosProfessores(criado.id, baseUrlFrom(request));
      docentes = { enviados: paraDocentes.enviados, ignorados: paraDocentes.ignorados };
    }

    return json(
      { ok: true, compromisso: criado, convite, convitesProfessores: docentes },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/compromissos", error);
    return serverError();
  }
}
