import { CORS_HEADERS, baseUrlFrom, corsJson, serverError } from "@/lib/api";
import { CARGOS, STATUSES, TIPOS, cargoInfo, statusInfo, tipoLabel } from "@/lib/constants";
import { contarPor, obterResumo } from "@/lib/repo";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Resumo público para painéis institucionais externos. */
export async function GET(request: NextRequest) {
  try {
    const resumo = await obterResumo();
    const base = baseUrlFrom(request);
    const porCargo = await contarPor("cargo_responsavel");
    const porLocal = await contarPor("local");

    return corsJson({
      ok: true,
      geradoEm: new Date().toISOString(),
      indicadores: {
        totalCompromissos: resumo.total,
        hoje: resumo.hoje,
        semanaAtual: resumo.semana,
        proximos7Dias: resumo.proximos7,
        mesAtual: resumo.mes,
        realizadosMes: resumo.realizadosMes,
        pendentesDeBaixa: resumo.atrasados,
        cancelados: resumo.cancelados,
      },
      cargos: CARGOS.map((cargo) => ({
        cargo: cargo.key,
        descricao: cargo.label,
        total: porCargo.find((c) => c.chave === cargo.key)?.total ?? 0,
      })),
      tipos: TIPOS.map((tipo) => ({
        tipo: tipo.key,
        descricao: tipoLabel(tipo.key),
        total: resumo.porTipo.find((c) => c.chave === tipo.key)?.total ?? 0,
      })),
      situacoes: STATUSES.map((status) => ({
        status: status.key,
        descricao: statusInfo(status.key).label,
        total: resumo.porStatus.find((c) => c.chave === status.key)?.total ?? 0,
      })),
      locaisMaisUtilizados: porLocal.slice(0, 10).map((local) => ({
        local: local.chave,
        total: local.total,
      })),
      proximoCompromisso: resumo.proximo
        ? {
            id: resumo.proximo.id,
            titulo: resumo.proximo.titulo,
            cargo: resumo.proximo.cargoResponsavel,
            cargoDescricao: cargoInfo(resumo.proximo.cargoResponsavel).label,
            local: resumo.proximo.local,
            dataInicio: resumo.proximo.dataInicio,
            horaInicio: resumo.proximo.horaInicio,
            horaFim: resumo.proximo.horaFim,
          }
        : null,
      links: {
        agenda: `${base}/api/public/v1/agenda`,
        ics: `${base}/api/public/v1/agenda.ics`,
        documentacao: `${base}/api-publica`,
      },
    });
  } catch (error) {
    console.error("GET /api/public/v1/resumo", error);
    return serverError();
  }
}
