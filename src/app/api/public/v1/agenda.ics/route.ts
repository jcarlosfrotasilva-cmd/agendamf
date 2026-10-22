import type { NextRequest } from "next/server";
import { CORS_HEADERS, baseUrlFrom, filtrosFromParams, serverError } from "@/lib/api";
import { cargoInfo } from "@/lib/constants";
import { ESCOLA } from "@/lib/escola";
import { calendario, evento } from "@/lib/ics";
import { listarCompromissos } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * FEED iCALENDAR PARA ASSINATURA EXTERNA
 * Basta apontar o Google Agenda / Outlook para esta URL para manter a agenda
 * da gestão escolar sincronizada em tempo real.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const filtros = filtrosFromParams(url.searchParams);
    const itens = await listarCompromissos({ ...filtros, incluirCancelados: true });
    const base = baseUrlFrom(request);

    const professorId = Number(url.searchParams.get("professorId"));
    const nomeFeed = Number.isFinite(professorId) && professorId > 0
      ? `${ESCOLA.nome} · Agenda do(a) professor(a)`
      : url.searchParams.get("cargo")
        ? `${ESCOLA.nome} · Agenda da Gestão`
        : `${ESCOLA.nome} · Agenda completa da escola`;
    const filtrados = nomeFeed;

    const corpo = calendario(
      filtrados,
      itens.map((item) => evento(item, cargoInfo, base, { comAlarme: true })),
      base,
    );

    return new Response(corpo, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="agenda-gestao-escolar.ics"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/public/v1/agenda.ics", error);
    return serverError();
  }
}
