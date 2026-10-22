import Link from "next/link";
import { GestorManager } from "@/components/GestorManager";
import { Card, StatCard } from "@/components/ui";
import { CARGOS } from "@/lib/constants";
import { listarGestores } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function GestoresPage() {
  const gestores = await listarGestores();
  const ativos = gestores.filter((g) => g.ativo).length;
  const comCompromissos = gestores.filter((g) => g.totalCompromissos > 0).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Equipe gestora
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Gestores e cargos
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Cadastre os profissionais por cargo para organizar a agenda, distribuir compromissos e
            gerar a visão de responsabilidade de cada função da gestão escolar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/compromissos/novo"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            ＋ Novo compromisso
          </Link>
          <Link
            href="/agenda?agrupamento=CARGO"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            Agenda organizada por cargo
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gestores cadastrados" value={gestores.length} icon="👥" />
        <StatCard label="Ativos" value={ativos} accent="emerald" icon="✅" />
        <StatCard label="Com compromissos" value={comCompromissos} accent="brand" icon="🗂️" />
        <StatCard
          label="Cargos mapeados"
          value={CARGOS.length}
          accent="amber"
          hint="Direção, vice-direção, coordenação e organização"
          icon="⚑"
        />
      </div>

      <GestorManager
        gestores={gestores.map((g) => ({
          id: g.id,
          nome: g.nome,
          cargo: g.cargo,
          email: g.email,
          telefone: g.telefone,
          escola: g.escola,
          ativo: g.ativo,
          totalCompromissos: g.totalCompromissos,
        }))}
      />

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900">Atribuições por cargo</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CARGOS.map((cargo) => (
            <div key={cargo.key} className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${cargo.accent} text-[11px] font-bold text-white`}>
                {cargo.sigla}
              </span>
              <p className="mt-2 text-xs font-semibold text-slate-800">{cargo.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{cargo.descricao}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
