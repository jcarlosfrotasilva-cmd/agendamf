"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATUSES } from "@/lib/constants";

export function StatusActions({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  async function alterar(novoStatus: string) {
    setOcupado(true);
    await fetch(`/api/compromissos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    setOcupado(false);
    router.refresh();
  }

  async function excluir() {
    setOcupado(true);
    await fetch(`/api/compromissos/${id}`, { method: "DELETE" });
    setOcupado(false);
    router.push("/agenda");
    router.refresh();
  }

  return (
    <div className="card-surface no-print p-5">
      <h2 className="text-sm font-semibold text-slate-900">Ações rápidas</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Atualize a situação do compromisso ou registre a baixa após a realização.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {STATUSES.filter((s) => s.key !== status).map((s) => (
          <button
            key={s.key}
            type="button"
            disabled={ocupado}
            onClick={() => void alterar(s.key)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold ring-1 ring-inset transition disabled:opacity-60 ${s.chip} hover:brightness-95`}
          >
            Marcar como {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <a
          href={`/api/compromissos/${id}/ics`}
          className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          📅 Baixar .ics (Google Agenda / Outlook)
        </a>
        <a
          href={`/compromissos/${id}/editar`}
          className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
        >
          ✏️ Editar dados
        </a>
        {confirmandoExclusao ? (
          <span className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-1.5 ring-1 ring-rose-200">
            <span className="text-xs font-medium text-rose-700">Excluir definitivamente?</span>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void excluir()}
              className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Sim, excluir
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoExclusao(false)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Não
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmandoExclusao(true)}
            className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50"
          >
            🗑️ Excluir compromisso
          </button>
        )}
      </div>
    </div>
  );
}
