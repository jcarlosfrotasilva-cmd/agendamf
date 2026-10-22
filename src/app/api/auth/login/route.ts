import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { badRequest, json, serverError } from "@/lib/api";
import {
  buscarUsuarioPorEmail,
  contarUsuarios,
  criarSessao,
  gerarHashSenha,
  papelInfo,
  verificarSenha,
} from "@/lib/auth";
import { registrarAuditoria } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * Login da equipe de gestão. Quando ainda não existe nenhum usuário, este
 * endpoint também cria o primeiro administrador (instalação nova).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      senha?: string;
      nome?: string;
      primeiroAcesso?: boolean;
    };

    const email = (body.email ?? "").trim().toLowerCase();
    const senha = body.senha ?? "";

    if (!email || !/\S+@\S+\.\S+/.test(email)) return badRequest("Informe um e-mail válido.");
    if (senha.length < 6) return badRequest("A senha deve ter pelo menos 6 caracteres.");

    const existentes = await contarUsuarios();

    // ---------- Instalação nova: cria o primeiro administrador ----------
    if (existentes === 0) {
      if (!body.primeiroAcesso) {
        return badRequest(
          "Nenhum usuário cadastrado. Confirme a criação do primeiro administrador.",
        );
      }
      const nome = (body.nome ?? "").trim();
      if (nome.length < 3) return badRequest("Informe o nome completo do administrador.");

      const [criado] = await db
        .insert(usuarios)
        .values({
          nome,
          email,
          senhaHash: gerarHashSenha(senha),
          papel: "ADMIN",
          cargo: "DIRETOR",
        })
        .returning();

      await registrarAuditoria({
        entidade: "usuario",
        entidadeId: criado?.id ?? null,
        acao: "PRIMEIRO_ACESSO",
        detalhe: `Administrador(a) ${nome} criado(a) no primeiro acesso do sistema.`,
      });

      if (!criado) return serverError("Não foi possível criar o administrador.");
      await criarSessao(criado);
      return json({
        ok: true,
        criado: true,
        usuario: { nome: criado.nome, email: criado.email, papel: criado.papel },
      });
    }

    // ---------- Login normal ----------
    const usuario = await buscarUsuarioPorEmail(email);
    if (!usuario || !usuario.ativo || !verificarSenha(senha, usuario.senhaHash)) {
      await registrarAuditoria({
        entidade: "usuario",
        entidadeId: usuario?.id ?? null,
        acao: "LOGIN_FALHA",
        detalhe: `Tentativa de acesso não autorizada para ${email}.`,
      });
      return json(
        { ok: false, error: "E-mail ou senha incorretos." },
        { status: 401 },
      );
    }

    await db.update(usuarios).set({ ultimoAcesso: new Date() }).where(eq(usuarios.id, usuario.id));
    await criarSessao(usuario);

    await registrarAuditoria({
      entidade: "usuario",
      entidadeId: usuario.id,
      acao: "LOGIN",
      detalhe: `Acesso autorizado — ${usuario.nome} (${papelInfo(usuario.papel).label}).`,
    });

    return json({
      ok: true,
      criado: false,
      usuario: { nome: usuario.nome, email: usuario.email, papel: usuario.papel },
    });
  } catch (error) {
    console.error("POST /api/auth/login", error);
    return serverError();
  }
}
