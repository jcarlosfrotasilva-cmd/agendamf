import Link from "next/link";
import { cargoInfo } from "@/lib/constants";
import { fmtShort, isoToday } from "@/lib/datetime";
import type { CompromissoComGestor } from "@/lib/repo";
import { CargoBadge, PrioridadeBadge, StatusBadge, TipoBadge } from "./ui";

export function CompromissoCard({
  item,
  mostrarData = false,
  compacto = false,
}: {
  item: CompromissoComGestor;
  mostrarData?: boolean;
  compacto?: boolean;
}) {
  const info = cargoInfo(item.cargoResponsavel);
  const hoje = isoToday();
  const atrasado =
    item.dataFim < hoje &&
    item.status !== "REALIZADO" &&
    item.status !== "CANCELADO";

  return (
    <article
      className={`group relative overflow-hidden rounded-xl bg-white p-4 ring-1 ring-slate-200 transition hover:ring-indigo-300 hover:shadow-md ${
        item.status === "CANCELADO" ? "opacity-70" : ""
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${info.dot}`} />
      <div className="flex flex-wrap items-start justify-between gap-3 pl-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-900 px-2 py-1 font-mono text-[11px] font-semibold text-white">
              {item.horaInicio} → {item.horaFim}
            </span>
            {mostrarData ? (
              <span className="text-[11px] font-semibold text-slate-500">
                {fmtShort(item.dataInicio)}
                {item.dataFim !== item.dataInicio ? ` → ${fmtShort(item.dataFim)}` : ""}
              </span>
            ) : null}
            <TipoBadge tipo={item.tipo} />
            <StatusBadge status={item.status} />
            <PrioridadeBadge prioridade={item.prioridade} />
            {atrasado ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                Pendente de baixa
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 text-sm font-semibold tracking-tight text-slate-900">
            <Link href={`/compromissos/${item.id}`} className="hover:text-indigo-700">
              {item.titulo}
            </Link>
          </h3>
          {!compacto ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{item.assunto}</p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>⌂</span>
              <span className="font-medium text-slate-700">{item.local}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>👤</span>
              <span className="font-medium text-slate-700">
                {item.gestorNome ?? info.short}
              </span>
            </span>
            {!compacto && item.participantes ? (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>👥</span>
                <span className="line-clamp-1 max-w-[260px]">{item.participantes}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <CargoBadge cargo={item.cargoResponsavel} compact />
          <div className="flex items-center gap-1.5">
            <Link
              href={`/compromissos/${item.id}`}
              className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Detalhes
            </Link>
            <Link
              href={`/compromissos/${item.id}/editar`}
              className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-indigo-700"
            >
              Editar
            </Link>
            <Link
              href={`/compromissos/${item.id}#whatsapp`}
              title={
                item.gestorTelefone
                  ? `Enviar mensagem pelo WhatsApp para ${item.gestorNome ?? "o responsável"}`
                  : "Abrir a área de envio por WhatsApp deste compromisso"
              }
              className="rounded-lg bg-[#25D366]/12 px-2 py-1.5 text-[11px] font-semibold text-[#128C7E] ring-1 ring-[#25D366]/30 transition hover:bg-[#25D366]/20"
            >
              💬 WhatsApp
            </Link>
            <a
              href={`/api/compromissos/${item.id}/ics`}
              title="Adicionar ao Google Agenda / Outlook"
              className="rounded-lg bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              📅 ICS
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
