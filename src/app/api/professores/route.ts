import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { professores } from "@/db/schema";
import { exigirEdicao } from "@/lib/auth";
import { badRequest, json, notFound, serverError } from "@/lib/api";
import { professorSchema, firstError, normalizeOptional } from "@/lib/validation";
import { listarProfessores, registrarAuditoria } from "@/lib/repo";
import { turnoInfo } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const itens = await listarProfessores({
      turno: params.get("turno") ?? undefined,
      ativo: params.get("todos") === "true" ? undefined : true,
    });
    return json({ ok: true, total: itens.length, itens });
  } catch (error) {
    console.error("GET /api/professores", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;
    const parsed = professorSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(firstError(parsed.error));
    const dados = parsed.data;

    const [criado] = await db
      .insert(professores)
      .values({
        nome: dados.nome,
        disciplina: normalizeOptional(dados.disciplina),
        turmas: normalizeOptional(dados.turmas),
        turno: dados.turno,
        email: normalizeOptional(dados.email),
        telefone: normalizeOptional(dados.telefone),
        observacoes: normalizeOptional(dados.observacoes),
        ativo: dados.ativo,
      })
      .returning();

    await registrarAuditoria({
      entidade: "professor",
      entidadeId: criado?.id ?? null,
      acao: "CRIAR",
      detalhe: `Professor(a) ${dados.nome} cadastrado(a) — turno ${turnoInfo(dados.turno).label}.`,
    });

    return json({ ok: true, professor: criado }, { status: 201 });
  } catch (error) {
    console.error("POST /api/professores", error);
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

    const existente = await db.select().from(professores).where(eq(professores.id, id)).limit(1);
    if (existente.length === 0) return notFound("Professor não encontrado");

    const parsed = professorSchema.safeParse(body);
    if (!parsed.success) return badRequest(firstError(parsed.error));
    const dados = parsed.data;

    const [atualizado] = await db
      .update(professores)
      .set({
        nome: dados.nome,
        disciplina: normalizeOptional(dados.disciplina),
        turmas: normalizeOptional(dados.turmas),
        turno: dados.turno,
        email: normalizeOptional(dados.email),
        telefone: normalizeOptional(dados.telefone),
        observacoes: normalizeOptional(dados.observacoes),
        ativo: dados.ativo,
      })
      .where(eq(professores.id, id))
      .returning();

    await registrarAuditoria({
      entidade: "professor",
      entidadeId: id,
      acao: "ATUALIZAR",
      detalhe: `Cadastro do professor(a) ${dados.nome} atualizado.`,
    });

    return json({ ok: true, professor: atualizado });
  } catch (error) {
    console.error("PATCH /api/professores", error);
    return serverError();
  }
}
