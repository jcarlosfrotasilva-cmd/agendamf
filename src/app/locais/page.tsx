import Link from "next/link";
import { Card, EmptyState, StatCard, StatusBadge } from "@/components/ui";
import { cargoInfo } from "@/lib/constants";
import { fmtShort, isoToday } from "@/lib/datetime";
import { listarCompromissos } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function LocaisPage() {
  const hoje = isoToday();
  const itens = await listarCompromissos({ periodo: "TODOS", ordenar: "LOCAL", limite: 800 });

  const mapa = new Map<
    string,
    {
      local: string;
      total: number;
      futuros: number;
      proximo: { data: string; hora: string; titulo: string; id: number } | null;
      cargos: Map<string, number>;
    }
  >();

  for (const item of itens) {
    const atual =
      mapa.get(item.local) ??
      {
        local: item.local,
        total: 0,
        futuros: 0,
        proximo: null as null | { data: string; hora: string; titulo: string; id: number },
        cargos: new Map<string, number>(),
      };
    atual.total += 1;
    if (item.dataInicio >= hoje && item.status !== "CANCELADO") {
      atual.futuros += 1;
      if (!atual.proximo || `${item.dataInicio}T${item.horaInicio}` < `${atual.proximo.data}T${atual.proximo.hora}`) {
        atual.proximo = {
          data: item.dataInicio,
          hora: item.horaInicio,
          titulo: item.titulo,
          id: item.id,
        };
      }
    }
    atual.cargos.set(item.cargoResponsavel, (atual.cargos.get(item.cargoResponsavel) ?? 0) + 1);
    mapa.set(item.local, atual);
  }

  const locais = Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  const ocupadosHoje = itens.filter((i) => i.dataInicio <= hoje && i.dataFim >= hoje).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Organização por local
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Locais e ocupação da agenda
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Visão consolidada dos espaços utilizados pela gestão, com total de compromissos,
            cargos envolvidos e a próxima ocupação programada de cada local.
          </p>
        </div>
        <Link
          href="/agenda?agrupamento=LOCAL"
          className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
        >
          Ver agenda agrupada por local
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Locais utilizados" value={locais.length} icon="⌂" />
        <StatCard label="Compromissos registrados" value={itens.length} accent="brand" icon="🗂️" />
        <StatCard label="Ocupações hoje" value={ocupadosHoje} accent="emerald" icon="📌" />
        <StatCard
          label="Local mais usado"
          value={locais[0]?.total ?? 0}
          accent="amber"
          hint={locais[0]?.local ?? "—"}
          icon="🏆"
        />
      </div>

      {locais.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title="Nenhum local registrado ainda"
            description="Ao agendar compromissos com local informado, esta visão é preenchida automaticamente."
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {locais.map((local) => (
            <Card key={local.local} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{local.local}</h2>
                  <p className="text-[11px] text-slate-500">
                    {local.total} compromisso(s) · {local.futuros} futuro(s)
                  </p>
                </div>
                <Link
                  href={`/agenda?local=${encodeURIComponent(local.local)}&periodo=TODOS`}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Abrir na agenda
                </Link>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {Array.from(local.cargos.entries()).map(([cargo, total]) => {
                  const info = cargoInfo(cargo);
                  return (
                    <span
                      key={cargo}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${info.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${info.dot}`} />
                      {info.sigla} · {total}
                    </span>
                  );
                })}
              </div>

              {local.proximo ? (
                <div className="mt-3 rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Próxima ocupação
                  </p>
                  <Link
                    href={`/compromissos/${local.proximo.id}`}
                    className="mt-0.5 block text-xs font-semibold text-slate-800 hover:text-indigo-700"
                  >
                    {local.proximo.titulo}
                  </Link>
                  <p className="text-[11px] text-slate-500">
                    {fmtShort(local.proximo.data)} às {local.proximo.hora}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-slate-400">
                  Sem ocupações futuras registradas para este local.
                </p>
              )}

              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                {itens
                  .filter((i) => i.local === local.local)
                  .slice(0, 3)
                  .map((i) => (
                    <div key={i.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/compromissos/${i.id}`}
                          className="block truncate text-[11px] font-semibold text-slate-700 hover:text-indigo-700"
                        >
                          {i.titulo}
                        </Link>
                        <p className="text-[10px] text-slate-500">
                          {fmtShort(i.dataInicio)} · {i.horaInicio} → {i.horaFim}
                        </p>
                      </div>
                      <StatusBadge status={i.status} />
                    </div>
                  ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
