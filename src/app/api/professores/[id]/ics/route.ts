import type { NextRequest } from "next/server";
import { badRequest, baseUrlFrom, notFound } from "@/lib/api";
import { cargoInfo } from "@/lib/constants";
import { ESCOLA } from "@/lib/escola";
import { calendario, evento } from "@/lib/ics";
import { listarCompromissos, obterProfessor } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * AGENDA DO PROFESSOR EM FORMATO iCALENDAR
 * Cada professor pode assinar a própria agenda no Google Agenda / Outlook.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const numero = Number(id);
  if (!Number.isFinite(numero) || numero <= 0) return badRequest("Identificador inválido");

  const professor = await obterProfessor(numero);
  if (!professor) return notFound("Professor não encontrado");

  const itens = await listarCompromissos({
    professorId: numero,
    periodo: "TODOS",
    incluirCancelados: true,
    ordenar: "DATA",
    limite: 800,
  });

  const base = baseUrlFrom(request);
  const corpo = calendario(
    `${ESCOLA.nome} · Agenda do(a) professor(a) ${professor.nome}`,
    itens.map((item) => evento(item, cargoInfo, base, { comAlarme: true })),
    base,
  );

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="agenda-professor-${professor.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
