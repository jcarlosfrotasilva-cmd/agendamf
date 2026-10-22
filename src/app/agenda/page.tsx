import Link from "next/link";
import { CompromissoLista } from "@/components/CompromissoLista";
import { FilterBar } from "@/components/FilterBar";
import { Card, StatCard } from "@/components/ui";
import {
  AGRUPAMENTOS,
  CARGOS,
  PERIODOS,
  TIPOS,
  TIPOS_COLEGIADOS,
  cargoInfo,
  statusInfo,
} from "@/lib/constants";
import { fmtLong, isoToday } from "@/lib/datetime";
import { contarPor, listarCompromissos, listarGestores, listarProfessores } from "@/lib/repo";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function um(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function AgendaPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const periodo = um(sp.periodo) ?? "TODOS";
  const data = um(sp.data) ?? "";
  const cargo = um(sp.cargo) ?? "";
  const tipo = um(sp.tipo) ?? "";
  const status = um(sp.status) ?? "";
  const local = um(sp.local) ?? "";
  const busca = um(sp.busca) ?? "";
  const gestorId = um(sp.gestorId) ?? "";
  const professorId = um(sp.professorId) ?? "";
  const agrupamento = um(sp.agrupamento) ?? "DATA";

  const [itens, gestores, docentes, locaisContagem] = await Promise.all([
    listarCompromissos({
      periodo: data ? undefined : periodo,
      de: data || undefined,
      ate: data || undefined,
      sobrepor: Boolean(data),
      cargo: cargo || undefined,
      tipo: tipo || undefined,
      status: status || undefined,
      local: local || undefined,
      busca: busca || undefined,
      gestorId: gestorId ? Number(gestorId) : undefined,
      professorId: professorId ? Number(professorId) : undefined,
      ordenar: agrupamento === "CARGO" ? "CARGO" : agrupamento === "LOCAL" ? "LOCAL" : "DATA",
      incluirCancelados: true,
      limite: 600,
    }),
    listarGestores(),
    listarProfessores({ ativo: undefined }),
    contarPor("local"),
  ]);

  const hoje = isoToday();
  const futuros = itens.filter((i) => i.dataInicio >= hoje).length;
  const realizados = itens.filter((i) => i.status === "REALIZADO").length;
  const cancelados = itens.filter((i) => i.status === "CANCELADO").length;
  const porCargo = CARGOS.map((c) => ({
    cargo: c,
    total: itens.filter((i) => i.cargoResponsavel === c.key).length,
  }));

  const queryIcs = new URLSearchParams();
  if (data) {
    queryIcs.set("de", data);
    queryIcs.set("ate", data);
  } else {
    queryIcs.set("periodo", periodo);
  }
  if (cargo) queryIcs.set("cargo", cargo);
  if (tipo) queryIcs.set("tipo", tipo);
  if (local) queryIcs.set("local", local);
  queryIcs.set("formato", "ics");

  const rotuloPeriodo = data
    ? fmtLong(data)
    : (PERIODOS.find((p) => p.key === periodo)?.label ?? "Todo o período");
  const rotuloAgrupamento =
    AGRUPAMENTOS.find((a) => a.key === agrupamento)?.label ?? "Por data";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Organização da agenda
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Agenda de compromissos da gestão
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Filtre por cargo, data e local — visualize {rotuloAgrupamento.toLowerCase()} com{" "}
            <strong className="font-semibold text-slate-800">{itens.length}</strong> compromisso(s)
            em <strong className="font-semibold text-slate-800">{rotuloPeriodo}</strong>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/compromissos/novo"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            ＋ Novo compromisso
          </Link>
          <a
            href={`/api/public/v1/agenda?${queryIcs.toString()}`}
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            ⤓ Exportar resultado (.ics)
          </a>
        </div>
      </header>

      <FilterBar
        locais={locaisContagem.map((l) => l.chave).sort((a, b) => a.localeCompare(b, "pt-BR"))}
        gestores={gestores.map((g) => ({ id: g.id, nome: g.nome, cargo: g.cargo }))}
        professores={docentes.map((p) => ({
          id: p.id,
          nome: p.nome,
          disciplina: p.disciplina,
        }))}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Compromissos filtrados" value={itens.length} hint={rotuloPeriodo} icon="📚" />
        <StatCard label="Ainda vão acontecer" value={futuros} accent="emerald" hint="Data igual ou posterior a hoje" icon="⏳" />
        <StatCard label="Já realizados" value={realizados} accent="slate" hint="Baixa registrada" icon="✅" />
        <StatCard label="Cancelados" value={cancelados} accent="rose" hint="Removidos da execução" icon="🚫" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Atalhos por cargo:
          </span>
          {porCargo.map(({ cargo: c, total }) => (
            <Link
              key={c.key}
              href={`/agenda?cargo=${c.key}&periodo=${data ? "" : periodo}${data ? `&data=${data}` : ""}&agrupamento=LOCAL`}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-inset transition hover:brightness-95 ${c.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
              {c.short} · {total}
            </Link>
          ))}
          {status ? (
            <span className="text-[11px] font-medium text-slate-500">
              Situação aplicada: {statusInfo(status).label}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Por tipo:
          </span>
          {TIPOS.map((t) => {
            const total = itens.filter((i) => i.tipo === t.key).length;
            const ativo = tipo === t.key;
            return (
              <Link
                key={t.key}
                href={`/agenda?tipo=${t.key}&periodo=${data ? "" : periodo}${data ? `&data=${data}` : ""}&agrupamento=DATA`}
                title={t.descricao}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-inset transition hover:brightness-95 ${
                  ativo ? "bg-slate-900 text-white ring-slate-900" : t.chip
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${ativo ? "bg-white" : t.bar}`} />
                {t.label} · {total}
              </Link>
            );
          })}
          <Link
            href={`/compromissos/novo?tipo=${
              (TIPOS_COLEGIADOS as string[]).includes(tipo) ? tipo : "REUNIAO_APM"
            }`}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-indigo-700"
          >
            ＋ Agendar reunião colegiada
          </Link>
        </div>
      </Card>

      <CompromissoLista
        itens={itens}
        agrupamento={agrupamento}
        mostrarData={agrupamento !== "DATA"}
        tituloVazio="Nenhum compromisso corresponde aos filtros"
        descricaoVazio="Ajuste o período, o cargo ou o local e tente novamente. Você também pode criar um novo compromisso agora mesmo."
      />

      <p className="text-[11px] text-slate-400">
        Organização por cargo: {CARGOS.map((c) => `${cargoInfo(c.key).short}`).join(" · ")}.
        O mesmo compromisso aparece em todas as visões de organização (data, cargo, local e tipo).
      </p>
    </div>
  );
}
