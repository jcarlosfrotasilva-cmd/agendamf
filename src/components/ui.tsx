import type { ReactNode } from "react";
import { cargoInfo, prioridadeInfo, statusInfo, tipoInfo } from "@/lib/constants";

export function CargoBadge({ cargo, compact = false }: { cargo: string; compact?: boolean }) {
  const info = cargoInfo(cargo);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${info.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${info.dot}`} />
      {compact ? info.short : info.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const info = statusInfo(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${info.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${info.bar}`} />
      {info.label}
    </span>
  );
}

export function PrioridadeBadge({ prioridade }: { prioridade: string }) {
  if (prioridade === "NORMAL") return null;
  const info = prioridadeInfo(prioridade);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${info.chip}`}
    >
      {prioridade === "URGENTE" ? "⚡ " : ""}
      {info.label}
    </span>
  );
}

export function TipoBadge({
  tipo,
  compacto = false,
}: {
  tipo: string;
  compacto?: boolean;
}) {
  const info = tipoInfo(tipo);
  return (
    <span
      title={info.descricao}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${info.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${info.bar}`} />
      {compacto ? info.sigla : info.label}
    </span>
  );
}

export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`card-surface ${className}`}>
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "brand",
  icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: "brand" | "emerald" | "amber" | "rose" | "slate";
  icon?: ReactNode;
}) {
  const accents: Record<string, string> = {
    brand: "from-indigo-500/12 to-indigo-500/0 text-indigo-600",
    emerald: "from-emerald-500/12 to-emerald-500/0 text-emerald-600",
    amber: "from-amber-500/15 to-amber-500/0 text-amber-600",
    rose: "from-rose-500/12 to-rose-500/0 text-rose-600",
    slate: "from-slate-500/12 to-slate-500/0 text-slate-600",
  };
  return (
    <div className="card-surface relative overflow-hidden p-5">
      <div
        className={`pointer-events-none absolute inset-x-0 -top-8 h-24 bg-gradient-to-b ${accents[accent]}`}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          {icon ? <span className="text-lg leading-none">{icon}</span> : null}
        </div>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}

export function BarList({
  items,
  total,
  colors,
  onEmpty = "Sem dados ainda",
}: {
  items: { chave: string; total: number }[];
  total: number;
  colors: string[];
  onEmpty?: string;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">{onEmpty}</p>;
  }
  const max = Math.max(...items.map((i) => i.total), 1);
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={item.chave}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700">{item.chave}</span>
            <span className="shrink-0 text-xs font-semibold text-slate-500">
              {item.total}
              {total > 0 ? ` · ${Math.round((item.total / total) * 100)}%` : ""}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${colors[index % colors.length]}`}
              style={{ width: `${Math.max((item.total / max) * 100, 6)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center">
      <span className="text-2xl">🗓️</span>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="max-w-md text-xs text-slate-500">{description}</p> : null}
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500";

export const selectClass = `${inputClass} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="%2364748b"><path d="M5.5 7.5 10 12l4.5-4.5z"/></svg>')] bg-[length:18px_18px] bg-[right_0.55rem_center] bg-no-repeat pr-9`;
