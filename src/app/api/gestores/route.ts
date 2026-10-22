import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gestores } from "@/db/schema";
import { exigirEdicao } from "@/lib/auth";
import { badRequest, json, notFound, serverError } from "@/lib/api";
import { listarGestores, registrarAuditoria } from "@/lib/repo";
import { cargoInfo } from "@/lib/constants";
import { firstError, gestorSchema, normalizeOptional } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const itens = await listarGestores();
    return json({ ok: true, total: itens.length, itens });
  } catch (error) {
    console.error("GET /api/gestores", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;
    const body = await request.json();
    const parsed = gestorSchema.safeParse(body);
    if (!parsed.success) return badRequest(firstError(parsed.error));
    const dados = parsed.data;

    const [criado] = await db
      .insert(gestores)
      .values({
        nome: dados.nome,
        cargo: dados.cargo,
        email: normalizeOptional(dados.email),
        telefone: normalizeOptional(dados.telefone),
        escola: normalizeOptional(dados.escola),
        ativo: dados.ativo,
      })
      .returning();

    await registrarAuditoria({
      entidade: "gestor",
      entidadeId: criado?.id ?? null,
      acao: "CRIAR",
      detalhe: `${dados.nome} cadastrado(a) como ${cargoInfo(dados.cargo).label}.`,
    });

    return json({ ok: true, gestor: criado }, { status: 201 });
  } catch (error) {
    console.error("POST /api/gestores", error);
    return serverError();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;
    const body = (await request.json()) as { id?: number } & Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) return badRequest("Identificador inválido");

    const existente = await db.select().from(gestores).where(eq(gestores.id, id)).limit(1);
    if (existente.length === 0) return notFound("Gestor não encontrado");

    const parsed = gestorSchema.safeParse(body);
    if (!parsed.success) return badRequest(firstError(parsed.error));
    const dados = parsed.data;

    const [atualizado] = await db
      .update(gestores)
      .set({
        nome: dados.nome,
        cargo: dados.cargo,
        email: normalizeOptional(dados.email),
        telefone: normalizeOptional(dados.telefone),
        escola: normalizeOptional(dados.escola),
        ativo: dados.ativo,
      })
      .where(eq(gestores.id, id))
      .returning();

    await registrarAuditoria({
      entidade: "gestor",
      entidadeId: id,
      acao: "ATUALIZAR",
      detalhe: `Cadastro de ${dados.nome} atualizado.`,
    });

    return json({ ok: true, gestor: atualizado });
  } catch (error) {
    console.error("PATCH /api/gestores", error);
    return serverError();
  }
}
