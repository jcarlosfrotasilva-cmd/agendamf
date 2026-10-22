import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { compromissos, gestores } from "@/db/schema";
import { json, serverError } from "@/lib/api";
import { addDays, isoToday } from "@/lib/datetime";
import type { AlarmeItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Alimenta o "Despertador de Compromisso" do navegador: devolve os compromissos
 * de hoje até 8 dias à frente (e os que começaram nas últimas horas), com o
 * tempo de antecedência configurado por compromisso.
 */
export async function GET() {
  try {
    const hoje = isoToday();
    const linhas = await db
      .select({
        id: compromissos.id,
        titulo: compromissos.titulo,
        tipo: compromissos.tipo,
        assunto: compromissos.assunto,
        cargoResponsavel: compromissos.cargoResponsavel,
        local: compromissos.local,
        dataInicio: compromissos.dataInicio,
        dataFim: compromissos.dataFim,
        horaInicio: compromissos.horaInicio,
        horaFim: compromissos.horaFim,
        lembreteMinutos: compromissos.lembreteMinutos,
        status: compromissos.status,
        prioridade: compromissos.prioridade,
        despertadorAtivo: compromissos.despertadorAtivo,
        gestorNome: gestores.nome,
        gestorTelefone: gestores.telefone,
      })
      .from(compromissos)
      .leftJoin(gestores, eq(compromissos.gestorId, gestores.id))
      .where(
        and(
          eq(compromissos.despertadorAtivo, true),
          inArray(compromissos.status, ["AGENDADO", "CONFIRMADO", "EM_ANDAMENTO", "ADIADO"]),
          gte(compromissos.dataFim, addDays(hoje, -1)),
          lte(compromissos.dataInicio, addDays(hoje, 8)),
        ),
      )
      .orderBy(asc(compromissos.dataInicio), asc(compromissos.horaInicio))
      .limit(120);

    const itens: AlarmeItem[] = linhas.map((l) => ({
      ...l,
      gestorNome: l.gestorNome ?? null,
      gestorTelefone: l.gestorTelefone ?? null,
    }));

    return json({ itens, agora: new Date().toISOString(), total: itens.length });
  } catch (error) {
    console.error("GET /api/compromissos/despertador", error);
    return serverError();
  }
}
