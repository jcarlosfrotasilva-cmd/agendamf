import type { NextRequest } from "next/server";
import {
  CORS_HEADERS,
  baseUrlFrom,
  corsJson,
  filtrosFromParams,
  serverError,
  toPublico,
  tokenFromRequest,
} from "@/lib/api";
import { cargoInfo } from "@/lib/constants";
import { ESCOLA } from "@/lib/escola";
import { calendario, evento } from "@/lib/ics";
import { listarCompromissos, validarToken } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * CONSULTA EXTERNA ONLINE (somente leitura)
 * GET /api/public/v1/agenda?de=2026-01-01&ate=2026-12-31&cargo=DIRETOR&local=...&formato=json|ics
 * Chave opcional: ?key=TOKEN ou header X-Api-Key → libera campos detalhados.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const filtros = filtrosFromParams(url.searchParams);
    const chave = await validarToken(tokenFromRequest(request));
    const detalhado = Boolean(chave);
    const base = baseUrlFrom(request);

    const itens = await listarCompromissos({ ...filtros, incluirCancelados: true });
    const formato = url.searchParams.get("formato") ?? "json";

    if (formato.toLowerCase() === "ics") {
      const corpo = calendario(
        `${ESCOLA.nome} · Agenda da Gestão`,
        itens.map((item) => evento(item, cargoInfo, base, { comAlarme: false })),
        base,
      );
      return new Response(corpo, {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/calendar; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    return corsJson({
      ok: true,
      fonte: "agenda-gestao-escolar",
      modo: detalhado ? "detalhado (chave válida)" : "publico",
      geradoEm: new Date().toISOString(),
      filtros: {
        de: filtros.de ?? null,
        ate: filtros.ate ?? null,
        periodo: filtros.periodo ?? null,
        cargo: filtros.cargo ?? null,
        tipo: filtros.tipo ?? null,
        local: filtros.local ?? null,
        status: filtros.status ?? null,
        busca: filtros.busca ?? null,
        professorId: filtros.professorId ?? null,
      },
      total: itens.length,
      itens: itens.map((item) => toPublico(item, detalhado)),
      links: {
        resumo: `${base}/api/public/v1/resumo`,
        ics: `${base}/api/public/v1/agenda.ics`,
        documentacao: `${base}/api-publica`,
        openapi: `${base}/api/public/v1/openapi`,
      },
    });
  } catch (error) {
    console.error("GET /api/public/v1/agenda", error);
    return serverError();
  }
}
