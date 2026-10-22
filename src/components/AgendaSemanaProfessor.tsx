import Link from "next/link";
import { statusInfo, tipoInfo } from "@/lib/constants";
import { addDays, fmtDayMonth, fmtWeekday, isoToday } from "@/lib/datetime";
import type { CompromissoComGestor } from "@/lib/repo";

export function AgendaSemanaProfessor({
  itens,
  inicio,
}: {
  itens: CompromissoComGestor[];
  inicio?: string;
}) {
  const base = inicio ?? isoToday();
  const dias = Array.from({ length: 7 }, (_, indice) => {
    const dia = addDays(base, indice);
    const doDia = itens
      .filter((item) => item.dataInicio <= dia && item.dataFim >= dia)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    return { dia, doDia };
  });

  return (
    <div className="grid gap-3 overflow-x-auto pb-1 sm:grid-cols-2 xl:grid-cols-4">
      {dias.map(({ dia, doDia }) => {
        const hoje = dia === isoToday();
        return (
          <div
            key={dia}
            className={`min-w-[210px] rounded-xl bg-white p-3 ring-1 ${
              hoje ? "ring-2 ring-indigo-400" : "ring-slate-200"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {fmtWeekday(dia)}
                </p>
                <p className="text-sm font-semibold text-slate-900">{fmtDayMonth(dia)}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  doDia.length > 0
                    ? "bg-indigo-50 text-indigo-700"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {doDia.length}
              </span>
            </div>
            <ul className="mt-2 space-y-2">
              {doDia.length === 0 ? (
                <li className="rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] text-slate-400">
                  Dia livre na agenda escolar
                </li>
              ) : (
                doDia.map((item) => {
                  const tipo = tipoInfo(item.tipo);
                  const status = statusInfo(item.status);
                  return (
                    <li key={`${item.id}-${dia}`}>
                      <Link
                        href={`/compromissos/${item.id}`}
                        className="block rounded-lg border border-slate-200 p-2 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tipo.bar}`} />
                          <span className="font-mono text-[10px] font-semibold text-slate-600">
                            {item.horaInicio}–{item.horaFim}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-slate-800">
                          {item.titulo}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">{item.local}</p>
                        <p className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold ${status.chip}`}>
                          {status.label}
                        </p>
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
