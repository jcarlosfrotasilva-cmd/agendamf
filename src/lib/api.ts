import type { NextRequest } from "next/server";
import type { Filtros, CompromissoComGestor } from "./repo";
import { cargoInfo, tipoLabel } from "./constants";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Api-Key, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function corsJson(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init?.headers ?? {}) },
  });
}

export function badRequest(message: string) {
  return Response.json({ ok: false, error: message }, { status: 400 });
}

export function notFound(message = "Registro não encontrado") {
  return Response.json({ ok: false, error: message }, { status: 404 });
}

export function serverError(message = "Erro interno do servidor") {
  return Response.json({ ok: false, error: message }, { status: 500 });
}

export function filtrosFromParams(params: URLSearchParams): Filtros {
  const numero = (valor: string | null) => {
    if (!valor) return undefined;
    const n = Number(valor);
    return Number.isFinite(n) ? n : undefined;
  };
  const texto = (valor: string | null) => {
    const t = valor?.trim();
    return t && t.length > 0 ? t : undefined;
  };
  const ordenar = texto(params.get("ordenar"));
  return {
    periodo: texto(params.get("periodo")),
    de: texto(params.get("de")),
    ate: texto(params.get("ate")),
    cargo: texto(params.get("cargo")),
    tipo: texto(params.get("tipo")),
    status: texto(params.get("status")),
    local: texto(params.get("local")),
    busca: texto(params.get("busca")) ?? texto(params.get("q")),
    gestorId: numero(params.get("gestorId")),
    professorId: numero(params.get("professorId")),
    incluirCancelados: params.get("incluirCancelados") === "true",
    ordenar:
      ordenar === "CARGO" || ordenar === "LOCAL" || ordenar === "TITULO" ? ordenar : "DATA",
    limite: numero(params.get("limite")) ?? undefined,
  };
}

export type AgendaPublica = {
  id: number;
  titulo: string;
  tipo: string;
  tipoDescricao: string;
  assunto: string;
  cargo: string;
  cargoDescricao: string;
  local: string;
  dataInicio: string;
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  prioridade: string;
  status: string;
  atualizadoEm: string;
  participantes?: string | null;
  descricao?: string | null;
  responsavel?: string | null;
};

export function toPublico(
  item: CompromissoComGestor,
  detalhado: boolean,
): AgendaPublica {
  const base: AgendaPublica = {
    id: item.id,
    titulo: item.titulo,
    tipo: item.tipo,
    tipoDescricao: tipoLabel(item.tipo),
    assunto: item.assunto,
    cargo: item.cargoResponsavel,
    cargoDescricao: cargoInfo(item.cargoResponsavel).label,
    local: item.local,
    dataInicio: item.dataInicio,
    dataFim: item.dataFim,
    horaInicio: item.horaInicio,
    horaFim: item.horaFim,
    prioridade: item.prioridade,
    status: item.status,
    atualizadoEm: item.atualizadoEm.toISOString(),
  };
  if (detalhado) {
    base.participantes = item.participantes;
    base.descricao = item.descricao;
    base.responsavel = item.gestorNome;
  }
  return base;
}

export function baseUrlFrom(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export function tokenFromRequest(request: NextRequest): string | null {
  const url = new URL(request.url);
  const porQuery = url.searchParams.get("key") ?? url.searchParams.get("token");
  if (porQuery) return porQuery;
  const header = request.headers.get("x-api-key");
  if (header) return header;
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return null;
}
