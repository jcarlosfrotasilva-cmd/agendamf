"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { AGRUPAMENTOS, CARGOS, PERIODOS, STATUSES, TIPOS } from "@/lib/constants";
import { inputClass, selectClass } from "./ui";

export type FiltroOpcoes = {
  locais: string[];
  gestores: { id: number; nome: string; cargo: string }[];
  professores?: { id: number; nome: string; disciplina: string | null }[];
};

export function FilterBar({ locais, gestores, professores = [] }: FiltroOpcoes) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const [busca, setBusca] = useState(params.get("busca") ?? "");

  const valores = useMemo(() => {
    return {
      periodo: params.get("periodo") ?? "TODOS",
      data: params.get("data") ?? "",
      cargo: params.get("cargo") ?? "",
      tipo: params.get("tipo") ?? "",
      status: params.get("status") ?? "",
      local: params.get("local") ?? "",
      gestorId: params.get("gestorId") ?? "",
      professorId: params.get("professorId") ?? "",
      agrupamento: params.get("agrupamento") ?? "DATA",
      ordenar: params.get("ordenar") ?? "",
    };
  }, [params]);

  const aplicar = useCallback(
    (alteracoes: Record<string, string>) => {
      const proximos = new URLSearchParams(params.toString());
      Object.entries(alteracoes).forEach(([chave, valor]) => {
        if (valor) proximos.set(chave, valor);
        else proximos.delete(chave);
      });
      iniciar(() => {
        router.push(`/agenda?${proximos.toString()}`);
      });
    },
    [params, router],
  );

  const limpar = () => {
    iniciar(() => router.push("/agenda"));
  };

  return (
    <div className="card-surface no-print p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[210px] flex-1">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Busca livre
          </span>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              aplicar({ busca });
            }}
            className="flex gap-2"
          >
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Assunto, título, local, participantes..."
              className={inputClass}
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Buscar
            </button>
          </form>
        </label>

        <label className="w-[150px]">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Período
          </span>
          <select
            className={selectClass}
            value={valores.periodo}
            onChange={(event) => aplicar({ periodo: event.target.value, data: "" })}
          >
            {PERIODOS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="w-[160px]">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Dia específico
          </span>
          <input
            type="date"
            className={inputClass}
            value={valores.data}
            onChange={(event) => aplicar({ data: event.target.value, periodo: "" })}
          />
        </label>

        <label className="w-[190px]">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Cargo
          </span>
          <select
            className={selectClass}
            value={valores.cargo}
            onChange={(event) => aplicar({ cargo: event.target.value })}
          >
            <option value="">Todos os cargos</option>
            {CARGOS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="w-[190px]">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Local
          </span>
          <select
            className={selectClass}
            value={valores.local}
            onChange={(event) => aplicar({ local: event.target.value })}
          >
            <option value="">Todos os locais</option>
            {locais.map((local) => (
              <option key={local} value={local}>
                {local}
              </option>
            ))}
          </select>
        </label>

        <label className="w-[160px]">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Tipo
          </span>
          <select
            className={selectClass}
            value={valores.tipo}
            onChange={(event) => aplicar({ tipo: event.target.value })}
          >
            <option value="">Todos os tipos</option>
            {TIPOS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="w-[150px]">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Situação
          </span>
          <select
            className={selectClass}
            value={valores.status}
            onChange={(event) => aplicar({ status: event.target.value })}
          >
            <option value="">Todas</option>
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="w-[190px]">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Gestor responsável
          </span>
          <select
            className={selectClass}
            value={valores.gestorId}
            onChange={(event) => aplicar({ gestorId: event.target.value })}
          >
            <option value="">Todos os gestores</option>
            {gestores.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="w-[220px]">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Professor convocado
          </span>
          <select
            className={selectClass}
            value={valores.professorId}
            onChange={(event) => aplicar({ professorId: event.target.value })}
          >
            <option value="">Todos os professores</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
                {p.disciplina ? ` — ${p.disciplina}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="w-[170px]">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Organizar
          </span>
          <select
            className={selectClass}
            value={valores.agrupamento}
            onChange={(event) => aplicar({ agrupamento: event.target.value })}
          >
            {AGRUPAMENTOS.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={limpar}
          className="rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50"
        >
          Limpar filtros
        </button>
      </div>

      {pendente ? (
        <p className="mt-2 text-[11px] font-medium text-indigo-600">Atualizando agenda…</p>
      ) : null}
    </div>
  );
}
