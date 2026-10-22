import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mensagensWhatsapp } from "@/db/schema";
import { exigirEdicao } from "@/lib/auth";
import { badRequest, json, notFound, serverError } from "@/lib/api";
import { obterMensagem, registrarAuditoria } from "@/lib/repo";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function idFrom(ctx: Ctx) {
  const { id } = await ctx.params;
  const numero = Number(id);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

/** Atualiza a situação do registro (ex.: confirmar envio manual, registrar falha). */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;
    const id = await idFrom(ctx);
    if (!id) return badRequest("Identificador inválido");

    const atual = await obterMensagem(id);
    if (!atual) return notFound("Mensagem não encontrada");

    const body = (await request.json()) as { status?: string; erro?: string | null };
    const permitidos = ["GERADO", "ENVIADO", "FALHA", "CANCELADO"];
    if (!body.status || !permitidos.includes(body.status)) {
      return badRequest(`Situação inválida. Use: ${permitidos.join(", ")}.`);
    }

    const [atualizado] = await db
      .update(mensagensWhatsapp)
      .set({
        status: body.status,
        erro: body.erro ?? null,
        enviadoEm: body.status === "ENVIADO" ? new Date() : atual.enviadoEm,
      })
      .where(eq(mensagensWhatsapp.id, id))
      .returning();

    await registrarAuditoria({
      entidade: "mensagem_whatsapp",
      entidadeId: id,
      acao: "SITUACAO_WHATSAPP",
      detalhe: `Mensagem para ${atual.destinoNome} marcada como ${body.status}.`,
    });

    return json({ ok: true, registro: atualizado });
  } catch (error) {
    console.error("PATCH /api/whatsapp/[id]", error);
    return serverError();
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;
    const id = await idFrom(ctx);
    if (!id) return badRequest("Identificador inválido");
    const atual = await obterMensagem(id);
    if (!atual) return notFound("Mensagem não encontrada");
    await db.delete(mensagensWhatsapp).where(eq(mensagensWhatsapp.id, id));
    return json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/whatsapp/[id]", error);
    return serverError();
  }
}
