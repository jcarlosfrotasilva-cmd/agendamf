import type { NextRequest } from "next/server";
import { badRequest, baseUrlFrom, notFound } from "@/lib/api";
import { cargoInfo } from "@/lib/constants";
import { calendario, evento } from "@/lib/ics";
import { obterCompromisso } from "@/lib/repo";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const numero = Number(id);
  if (!Number.isFinite(numero) || numero <= 0) return badRequest("Identificador inválido");

  const item = await obterCompromisso(numero);
  if (!item) return notFound();

  const corpo = calendario(
    item.titulo,
    [evento(item, cargoInfo, baseUrlFrom(request), { comAlarme: true })],
    baseUrlFrom(request),
  );

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="compromisso-${item.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
