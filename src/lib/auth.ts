import "server-only";
import { cookies } from "next/headers";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios, type Usuario } from "@/db/schema";
import {
  COOKIE_SESSAO,
  assinarPayload,
  verificarTokenSessao,
  type PayloadSessao,
} from "./auth-edge";

export type Papel = "ADMIN" | "GESTAO" | "LEITURA";

export const PAPEIS: {
  key: Papel;
  label: string;
  descricao: string;
  chip: string;
}[] = [
  {
    key: "ADMIN",
    label: "Administrador(a)",
    descricao: "Acesso total, incluindo cadastro de usuários e configuração do sistema.",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  {
    key: "GESTAO",
    label: "Gestão escolar",
    descricao: "Cria compromissos, convoca professores, envia WhatsApp e dá baixa na agenda.",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  {
    key: "LEITURA",
    label: "Consulta (somente leitura)",
    descricao: "Acompanha a agenda e os relatórios, sem permissão para alterar registros.",
    chip: "bg-slate-100 text-slate-600 ring-slate-300",
  },
];

export function papelInfo(papel: string) {
  return (
    PAPEIS.find((p) => p.key === papel) ?? {
      key: "LEITURA" as Papel,
      label: papel,
      descricao: "",
      chip: "bg-slate-100 text-slate-600 ring-slate-300",
    }
  );
}

/** Hash de senha com scrypt (salt aleatório por usuário). */
export function gerarHashSenha(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivado = scryptSync(senha, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivado}`;
}

export function verificarSenha(senha: string, hash: string): boolean {
  try {
    const [algoritmo, salt, esperado] = hash.split("$");
    if (algoritmo !== "scrypt" || !salt || !esperado) return false;
    const derivado = scryptSync(senha, salt, 64);
    const referencia = Buffer.from(esperado, "hex");
    if (derivado.length !== referencia.length) return false;
    return timingSafeEqual(derivado, referencia);
  } catch {
    return false;
  }
}

export const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000; // 12 horas

export async function criarSessao(usuario: Usuario) {
  const payload: PayloadSessao = {
    uid: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel as Papel,
    exp: Date.now() + DURACAO_SESSAO_MS,
  };
  const token = await assinarPayload(payload);
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_SESSAO_MS / 1000,
  });
  return payload;
}

export async function encerrarSessao() {
  const jar = await cookies();
  jar.delete(COOKIE_SESSAO);
}

/**
 * Sessão atual. Sem cookie válido, MAS com usuários cadastrados, retorna null.
 * Em instalação nova (nenhum usuário), devolve um perfil de configuração para
 * permitir a criação do primeiro administrador.
 */
export async function getSessao(): Promise<PayloadSessao | null> {
  const jar = await cookies();
  const payload = await verificarTokenSessao(jar.get(COOKIE_SESSAO)?.value);
  return payload;
}

export async function exigirSessao(): Promise<PayloadSessao> {
  const sessao = await getSessao();
  if (!sessao) throw new Error("NAO_AUTENTICADO");
  return sessao;
}

/**
 * Garante sessão válida com permissão de edição (ADMIN ou GESTAO).
 * Devolve a resposta de erro pronta quando o acesso não é permitido, ou null
 * quando está liberado.
 */
export async function exigirEdicao(): Promise<PayloadSessao | Response> {
  const { json } = await import("./api");
  const sessao = await getSessao();
  if (!sessao) {
    return json(
      { ok: false, error: "Sessão expirada. Faça login novamente na área da gestão." },
      { status: 401 },
    );
  }
  if (!podeEditar(sessao.papel)) {
    return json(
      {
        ok: false,
        error:
          "Seu perfil é de consulta (somente leitura). Solicite permissão de edição a um administrador.",
      },
      { status: 403 },
    );
  }
  return sessao;
}

export async function exigirAdministracao(): Promise<PayloadSessao | Response> {
  const { json } = await import("./api");
  const sessao = await getSessao();
  if (!sessao) {
    return json({ ok: false, error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }
  if (!podeAdministrar(sessao.papel)) {
    return json({ ok: false, error: "Ação restrita a administradores." }, { status: 403 });
  }
  return sessao;
}

export async function contarUsuarios(): Promise<number> {
  const linhas = await db.select({ id: usuarios.id }).from(usuarios).limit(1);
  return linhas.length;
}

export async function buscarUsuarioPorEmail(email: string): Promise<Usuario | null> {
  const linhas = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, email.trim().toLowerCase()))
    .limit(1);
  return linhas[0] ?? null;
}

export async function buscarUsuario(id: number): Promise<Usuario | null> {
  const linhas = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
  return linhas[0] ?? null;
}

export function gerarTokenProfessor(): string {
  return `${randomUUID().replace(/-/g, "")}${randomBytes(8).toString("hex")}`;
}

export function podeEditar(papel: string | undefined): boolean {
  return papel === "ADMIN" || papel === "GESTAO";
}

export function podeAdministrar(papel: string | undefined): boolean {
  return papel === "ADMIN";
}
