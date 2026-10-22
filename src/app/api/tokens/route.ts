import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { apiTokens } from "@/db/schema";
import { badRequest, json, serverError } from "@/lib/api";
import { listarTokens, registrarAuditoria } from "@/lib/repo";
import { firstError, normalizeOptional, tokenSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function mascarar(token: string) {
  return `${token.slice(0, 8)}••••••••${token.slice(-4)}`;
}

export async function GET() {
  try {
    const tokens = await listarTokens();
    return json({
      ok: true,
      itens: tokens.map((t) => ({
        id: t.id,
        nome: t.nome,
        orgao: t.orgao,
        ativo: t.ativo,
        criadoEm: t.criadoEm,
        tokenMascarado: mascarar(t.token),
      })),
    });
  } catch (error) {
    console.error("GET /api/tokens", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = tokenSchema.safeParse(body);
    if (!parsed.success) return badRequest(firstError(parsed.error));

    const token = `age_${randomBytes(20).toString("hex")}`;
    const [criado] = await db
      .insert(apiTokens)
      .values({
        nome: parsed.data.nome,
        orgao: normalizeOptional(parsed.data.orgao),
        token,
      })
      .returning();

    await registrarAuditoria({
      entidade: "token",
      entidadeId: criado?.id ?? null,
      acao: "CRIAR",
      detalhe: `Chave de integração externa criada para ${parsed.data.nome}.`,
    });

    return json({ ok: true, token, registro: criado }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tokens", error);
    return serverError();
  }
}
