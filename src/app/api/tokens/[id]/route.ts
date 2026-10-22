import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiTokens } from "@/db/schema";
import { badRequest, json, notFound, serverError } from "@/lib/api";
import { registrarAuditoria } from "@/lib/repo";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function idFrom(ctx: Ctx) {
  const { id } = await ctx.params;
  const numero = Number(id);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const id = await idFrom(ctx);
    if (!id) return badRequest("Identificador inválido");
    const body = (await request.json()) as { ativo?: boolean };
    const existente = await db.select().from(apiTokens).where(eq(apiTokens.id, id)).limit(1);
    const registro = existente[0];
    if (!registro) return notFound("Chave não encontrada");

    const ativo = typeof body.ativo === "boolean" ? body.ativo : !registro.ativo;
    await db.update(apiTokens).set({ ativo }).where(eq(apiTokens.id, id));
    await registrarAuditoria({
      entidade: "token",
      entidadeId: id,
      acao: ativo ? "ATIVAR" : "REVOGAR",
      detalhe: `Chave de ${registro.nome} ${ativo ? "reativada" : "revogada"}.`,
    });
    return json({ ok: true, ativo });
  } catch (error) {
    console.error("PATCH /api/tokens/[id]", error);
    return serverError();
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const id = await idFrom(ctx);
    if (!id) return badRequest("Identificador inválido");
    const existente = await db.select().from(apiTokens).where(eq(apiTokens.id, id)).limit(1);
    if (existente.length === 0) return notFound("Chave não encontrada");
    await db.delete(apiTokens).where(eq(apiTokens.id, id));
    await registrarAuditoria({
      entidade: "token",
      entidadeId: id,
      acao: "EXCLUIR",
      detalhe: `Chave de ${existente[0].nome} excluída definitivamente.`,
    });
    return json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/tokens/[id]", error);
    return serverError();
  }
}
