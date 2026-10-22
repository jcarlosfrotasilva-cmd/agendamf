import type { NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { badRequest, json, notFound, serverError } from "@/lib/api";
import {
  buscarUsuario,
  buscarUsuarioPorEmail,
  exigirSessao,
  gerarHashSenha,
  papelInfo,
  podeAdministrar,
} from "@/lib/auth";
import { registrarAuditoria } from "@/lib/repo";
import { PAPEIS } from "@/lib/auth";
import { validarSenhaForte } from "@/lib/senha";

export const dynamic = "force-dynamic";

const PAPEIS_KEYS = PAPEIS.map((p) => p.key) as string[];

export async function GET() {
  try {
    const sessao = await exigirSessao();
    if (!podeAdministrar(sessao.papel)) {
      return json({ ok: false, error: "Apenas administradores podem listar usuários." }, { status: 403 });
    }
    const itens = await db
      .select({
        id: usuarios.id,
        nome: usuarios.nome,
        email: usuarios.email,
        papel: usuarios.papel,
        cargo: usuarios.cargo,
        ativo: usuarios.ativo,
        ultimoAcesso: usuarios.ultimoAcesso,
        criadoEm: usuarios.criadoEm,
      })
      .from(usuarios)
      .orderBy(asc(usuarios.nome));
    return json({ ok: true, total: itens.length, itens });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return json({ ok: false, error: "Sessão expirada." }, { status: 401 });
    }
    console.error("GET /api/usuarios", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessao = await exigirSessao();
    if (!podeAdministrar(sessao.papel)) {
      return json(
        { ok: false, error: "Apenas administradores podem cadastrar usuários." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      nome?: string;
      email?: string;
      senha?: string;
      papel?: string;
      cargo?: string;
    };

    const nome = (body.nome ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const senha = body.senha ?? "";
    const papel = body.papel ?? "GESTAO";

    if (nome.length < 3) return badRequest("Informe o nome completo.");
    if (!/\S+@\S+\.\S+/.test(email)) return badRequest("Informe um e-mail válido.");
    const politica = validarSenhaForte(senha, { email, nome });
    if (!politica.ok) return badRequest(politica.mensagem);
    if (!PAPEIS_KEYS.includes(papel)) return badRequest("Perfil de acesso inválido.");

    const existente = await buscarUsuarioPorEmail(email);
    if (existente) return badRequest("Já existe um usuário com este e-mail.");

    const [criado] = await db
      .insert(usuarios)
      .values({
        nome,
        email,
        senhaHash: gerarHashSenha(senha),
        papel,
        cargo: body.cargo?.trim() || null,
      })
      .returning();

    await registrarAuditoria({
      entidade: "usuario",
      entidadeId: criado?.id ?? null,
      acao: "CRIAR",
      detalhe: `${sessao.nome} cadastrou o usuário ${nome} (${papelInfo(papel).label}).`,
    });

    return json({ ok: true, usuario: criado }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return json({ ok: false, error: "Sessão expirada." }, { status: 401 });
    }
    console.error("POST /api/usuarios", error);
    return serverError();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessao = await exigirSessao();
    if (!podeAdministrar(sessao.papel)) {
      return json({ ok: false, error: "Apenas administradores podem alterar usuários." }, { status: 403 });
    }

    const body = (await request.json()) as {
      id?: number;
      nome?: string;
      papel?: string;
      cargo?: string;
      ativo?: boolean;
      senha?: string;
    };

    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) return badRequest("Identificador inválido");

    const usuario = await buscarUsuario(id);
    if (!usuario) return notFound("Usuário não encontrado");

    const papel = body.papel ?? usuario.papel;
    if (!PAPEIS_KEYS.includes(papel)) return badRequest("Perfil de acesso inválido.");
    const ativo = typeof body.ativo === "boolean" ? body.ativo : usuario.ativo;

    // Evita que o sistema fique sem administrador ativo.
    if (usuario.papel === "ADMIN" && (papel !== "ADMIN" || !ativo)) {
      const administradores = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.papel, "ADMIN"));
      const ativos = administradores.length;
      if (ativos <= 1) {
        return badRequest(
          "O sistema precisa de pelo menos um administrador ativo. Cadastre outro antes de alterar este.",
        );
      }
    }

    if (body.senha) {
      const politicaSenha = validarSenhaForte(body.senha, {
        email: usuario.email,
        nome: body.nome?.trim() || usuario.nome,
      });
      if (!politicaSenha.ok) return badRequest(politicaSenha.mensagem);
    }

    const [atualizado] = await db
      .update(usuarios)
      .set({
        nome: body.nome?.trim() || usuario.nome,
        papel,
        cargo: body.cargo?.trim() ?? usuario.cargo,
        ativo,
        ...(body.senha
          ? (() => {
              const politica = validarSenhaForte(body.senha as string, {
                email: usuario.email,
                nome: body.nome?.trim() || usuario.nome,
              });
              return politica.ok ? { senhaHash: gerarHashSenha(body.senha as string) } : {};
            })()
          : {}),
      })
      .where(eq(usuarios.id, id))
      .returning();

    await registrarAuditoria({
      entidade: "usuario",
      entidadeId: id,
      acao: "ATUALIZAR",
      detalhe: `${sessao.nome} atualizou o usuário ${atualizado?.nome} (${papelInfo(papel).label}${
        body.senha ? " · senha redefinida" : ""
      }).`,
    });

    return json({ ok: true, usuario: atualizado });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return json({ ok: false, error: "Sessão expirada." }, { status: 401 });
    }
    console.error("PATCH /api/usuarios", error);
    return serverError();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessao = await exigirSessao();
    if (!podeAdministrar(sessao.papel)) {
      return json({ ok: false, error: "Apenas administradores podem excluir usuários." }, { status: 403 });
    }

    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isFinite(id) || id <= 0) return badRequest("Identificador inválido");
    if (id === sessao.uid) return badRequest("Você não pode excluir o próprio usuário.");

    const usuario = await buscarUsuario(id);
    if (!usuario) return notFound("Usuário não encontrado");

    await db.delete(usuarios).where(eq(usuarios.id, id));
    await registrarAuditoria({
      entidade: "usuario",
      entidadeId: id,
      acao: "EXCLUIR",
      detalhe: `${sessao.nome} removeu o usuário ${usuario.nome}.`,
    });

    return json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return json({ ok: false, error: "Sessão expirada." }, { status: 401 });
    }
    console.error("DELETE /api/usuarios", error);
    return serverError();
  }
}
