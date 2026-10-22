import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { compromissos } from "@/db/schema";
import { exigirEdicao } from "@/lib/auth";
import { badRequest, json, notFound, serverError } from "@/lib/api";
import {
  definirProfessoresDoCompromisso,
  obterCompromisso,
  registrarAuditoria,
} from "@/lib/repo";
import {
  compromissoSchema,
  firstError,
  normalizeOptional,
  statusUpdateSchema,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function idFrom(ctx: Ctx) {
  const { id } = await ctx.params;
  const numero = Number(id);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const id = await idFrom(ctx);
    if (!id) return badRequest("Identificador inválido");
    const item = await obterCompromisso(id);
    if (!item) return notFound();
    return json({ ok: true, compromisso: item });
  } catch (error) {
    console.error("GET /api/compromissos/[id]", error);
    return serverError();
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;
    const id = await idFrom(ctx);
    if (!id) return badRequest("Identificador inválido");
    const body = (await request.json()) as Record<string, unknown>;

    // Atualização rápida apenas da situação (usada pelo despertador)
    const atual = await obterCompromisso(id);
    if (!atual) return notFound();

    const somenteStatus = Object.keys(body).length === 1 && "status" in body;
    if (somenteStatus) {
      const parsedStatus = statusUpdateSchema.safeParse(body);
      if (!parsedStatus.success) return badRequest(firstError(parsedStatus.error));
      const [atualizado] = await db
        .update(compromissos)
        .set({ status: parsedStatus.data.status, atualizadoEm: new Date() })
        .where(eq(compromissos.id, id))
        .returning();
      await registrarAuditoria({
        entidade: "compromisso",
        entidadeId: id,
        acao: "SITUACAO",
        detalhe: `Situação de "${atual.titulo}" alterada para ${parsedStatus.data.status}.`,
      });
      return json({ ok: true, compromisso: atualizado });
    }

    const parsed = compromissoSchema.safeParse(body);
    if (!parsed.success) return badRequest(firstError(parsed.error));
    const dados = parsed.data;

    const [atualizado] = await db
      .update(compromissos)
      .set({
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
        atualizadoEm: new Date(),
      })
      .where(eq(compromissos.id, id))
      .returning();

    let convocacoes = { adicionados: 0, removidos: 0 };
    if (dados.professorIds) {
      convocacoes = await definirProfessoresDoCompromisso(id, dados.professorIds);
    }

    await registrarAuditoria({
      entidade: "compromisso",
      entidadeId: id,
      acao: "ATUALIZAR",
      detalhe: `Compromisso "${dados.titulo}" atualizado (${dados.dataInicio} ${dados.horaInicio} · ${dados.local})${
        convocacoes.adicionados + convocacoes.removidos > 0
          ? ` · convocações: +${convocacoes.adicionados}/-${convocacoes.removidos}`
          : ""
      }.`,
    });

    return json({ ok: true, compromisso: atualizado, convocacoes });
  } catch (error) {
    console.error("PATCH /api/compromissos/[id]", error);
    return serverError();
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;
    const id = await idFrom(ctx);
    if (!id) return badRequest("Identificador inválido");
    const atual = await obterCompromisso(id);
    if (!atual) return notFound();
    await db.delete(compromissos).where(eq(compromissos.id, id));
    await registrarAuditoria({
      entidade: "compromisso",
      entidadeId: id,
      acao: "EXCLUIR",
      detalhe: `Compromisso "${atual.titulo}" excluído da agenda.`,
    });
    return json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/compromissos/[id]", error);
    return serverError();
  }
}
