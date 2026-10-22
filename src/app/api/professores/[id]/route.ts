import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { professores } from "@/db/schema";
import { badRequest, json, notFound, serverError } from "@/lib/api";
import { exigirEdicao, gerarTokenProfessor } from "@/lib/auth";
import { obterProfessor, registrarAuditoria } from "@/lib/repo";

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
    const professor = await obterProfessor(id);
    if (!professor) return notFound("Professor não encontrado");
    return json({ ok: true, professor });
  } catch (error) {
    console.error("GET /api/professores/[id]", error);
    return serverError();
  }
}

/** Gera (ou renova) o link pessoal de acesso do professor à própria agenda. */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;

    const id = await idFrom(ctx);
    if (!id) return badRequest("Identificador inválido");
    const professor = await obterProfessor(id);
    if (!professor) return notFound("Professor não encontrado");

    const body = (await request.json().catch(() => ({}))) as { renovar?: boolean };
    const token = body.renovar || !professor.tokenAcesso ? gerarTokenProfessor() : professor.tokenAcesso;

    await db.update(professores).set({ tokenAcesso: token }).where(eq(professores.id, id));
    await registrarAuditoria({
      entidade: "professor",
      entidadeId: id,
      acao: body.renovar ? "RENOVAR_ACESSO" : "GERAR_ACESSO",
      detalhe: `Link de acesso à agenda gerado para o(a) professor(a) ${professor.nome}.`,
    });

    return json({ ok: true, token, caminho: `/professor/${token}` });
  } catch (error) {
    console.error("PATCH /api/professores/[id]", error);
    return serverError();
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;
    const id = await idFrom(ctx);
    if (!id) return badRequest("Identificador inválido");
    const professor = await obterProfessor(id);
    if (!professor) return notFound("Professor não encontrado");

    await db.delete(professores).where(eq(professores.id, id));
    await registrarAuditoria({
      entidade: "professor",
      entidadeId: id,
      acao: "EXCLUIR",
      detalhe: `Professor(a) ${professor.nome} removido(a) do corpo docente (${professor.totalCompromissos} convocação(ões) desfeitas).`,
    });

    return json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/professores/[id]", error);
    return serverError();
  }
}
