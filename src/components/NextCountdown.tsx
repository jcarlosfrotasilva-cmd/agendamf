"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cargoInfo, prioridadeInfo, tipoLabel } from "@/lib/constants";
import { fmtCountdown, fmtLong, toLocalDate } from "@/lib/datetime";

export type ProximoCompromisso = {
  id: number;
  titulo: string;
  assunto: string;
  tipo: string;
  cargoResponsavel: string;
  local: string;
  dataInicio: string;
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  prioridade: string;
  status: string;
  gestorNome: string | null;
  participantes: string | null;
};

export function NextCountdown({ item }: { item: ProximoCompromisso }) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const inicio = toLocalDate(item.dataInicio, item.horaInicio).getTime();
  const fim = toLocalDate(item.dataFim, item.horaFim).getTime();
  const diff = inicio - agora;
  const emAndamento = diff <= 0 && agora < fim;
  const info = cargoInfo(item.cargoResponsavel);
  const prioridade = prioridadeInfo(item.prioridade);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 text-white shadow-xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
            Próximo compromisso
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
            {tipoLabel(item.tipo)}
          </span>
          {item.prioridade !== "NORMAL" ? (
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
              Prioridade {prioridade.label}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold leading-tight tracking-tight text-white">
              {item.titulo}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">{item.assunto}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
              <span className={`inline-flex items-center gap-1.5 font-semibold text-white`}>
                <span className={`h-2 w-2 rounded-full ${info.dot}`} />
                {info.label}
              </span>
              <span>🏫 {item.local}</span>
              <span>
                🗓️ {fmtLong(item.dataInicio)} · {item.horaInicio} → {item.horaFim}
              </span>
              {item.gestorNome ? <span>👤 {item.gestorNome}</span> : null}
              {item.participantes ? <span>👥 {item.participantes}</span> : null}
            </div>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {emAndamento ? "Em andamento" : "Inicia em"}
            </p>
            <p className="font-mono text-3xl font-semibold tracking-tight text-emerald-300">
              {emAndamento ? "agora" : fmtCountdown(diff)}
            </p>
            <Link
              href={`/compromissos/${item.id}`}
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Abrir compromisso →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
