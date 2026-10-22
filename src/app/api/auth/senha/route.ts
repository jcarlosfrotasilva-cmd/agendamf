import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { badRequest, json, serverError } from "@/lib/api";
import { exigirSessao, gerarHashSenha, verificarSenha } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/repo";
import { validarSenhaForte } from "@/lib/senha";

export const dynamic = "force-dynamic";

/**
 * Troca da própria senha (qualquer perfil autenticado).
 * Exige a senha atual para confirmar a identidade.
 */
export async function PATCH(request: NextRequest) {
  try {
    const sessao = await exigirSessao();
    const body = (await request.json()) as {
      senhaAtual?: string;
      novaSenha?: string;
      confirmacao?: string;
    };

    const senhaAtual = body.senhaAtual ?? "";
    const novaSenha = body.novaSenha ?? "";

    if (!senhaAtual) return badRequest("Informe a senha atual.");
    if (novaSenha !== (body.confirmacao ?? "")) {
      return badRequest("A confirmação não confere com a nova senha.");
    }
    if (senhaAtual === novaSenha) {
      return badRequest("A nova senha deve ser diferente da atual.");
    }

    const linhas = await db.select().from(usuarios).where(eq(usuarios.id, sessao.uid)).limit(1);
    const usuario = linhas[0];
    if (!usuario) return badRequest("Usuário não encontrado.");

    if (!verificarSenha(senhaAtual, usuario.senhaHash)) {
      await registrarAuditoria({
        entidade: "usuario",
        entidadeId: usuario.id,
        acao: "SENHA_FALHA",
        detalhe: `Tentativa de troca de senha com senha atual incorreta (${usuario.email}).`,
      });
      return json({ ok: false, error: "A senha atual está incorreta." }, { status: 401 });
    }

    const politica = validarSenhaForte(novaSenha, {
      email: usuario.email,
      nome: usuario.nome,
    });
    if (!politica.ok) return badRequest(politica.mensagem);

    await db
      .update(usuarios)
      .set({ senhaHash: gerarHashSenha(novaSenha) })
      .where(eq(usuarios.id, usuario.id));

    await registrarAuditoria({
      entidade: "usuario",
      entidadeId: usuario.id,
      acao: "SENHA_ALTERADA",
      detalhe: `${usuario.nome} alterou a própria senha de acesso.`,
    });

    return json({
      ok: true,
      mensagem: "Senha alterada com sucesso. Use a nova senha no próximo acesso.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return json({ ok: false, error: "Sessão expirada. Faça login novamente." }, { status: 401 });
    }
    console.error("PATCH /api/auth/senha", error);
    return serverError();
  }
}
