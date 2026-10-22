import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gestores } from "@/db/schema";
import { exigirEdicao } from "@/lib/auth";
import { badRequest, json, notFound, serverError } from "@/lib/api";
import { registrarAuditoria } from "@/lib/repo";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;
    const { id: rawId } = await ctx.params;
    const id = Number(rawId);
    if (!Number.isFinite(id) || id <= 0) return badRequest("Identificador inválido");

    const existente = await db.select().from(gestores).where(eq(gestores.id, id)).limit(1);
    const gestor = existente[0];
    if (!gestor) return notFound("Gestor não encontrado");

    await db.delete(gestores).where(eq(gestores.id, id));
    await registrarAuditoria({
      entidade: "gestor",
      entidadeId: id,
      acao: "EXCLUIR",
      detalhe: `Cadastro de ${gestor.nome} removido da equipe de gestão.`,
    });

    return json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/gestores/[id]", error);
    return serverError();
  }
}
