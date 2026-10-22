import { agrupar } from "@/lib/agrupar";
import type { CompromissoComGestor } from "@/lib/repo";
import { CompromissoCard } from "./CompromissoCard";
import { EmptyState } from "./ui";

export function CompromissoLista({
  itens,
  agrupamento = "DATA",
  mostrarData = false,
  compacto = false,
  tituloVazio = "Nenhum compromisso encontrado",
  descricaoVazio,
}: {
  itens: CompromissoComGestor[];
  agrupamento?: string;
  mostrarData?: boolean;
  compacto?: boolean;
  tituloVazio?: string;
  descricaoVazio?: string;
}) {
  if (itens.length === 0) {
    return <EmptyState title={tituloVazio} description={descricaoVazio} />;
  }

  const grupos = agrupar(itens, agrupamento);

  return (
    <div className="space-y-6">
      {grupos.map((grupo) => (
        <section key={grupo.chave}>
          <header className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${grupo.destaque ?? "bg-indigo-500"}`} />
              <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                {grupo.label}
              </h3>
              {grupo.sublabel ? (
                <span className="text-[11px] text-slate-500">{grupo.sublabel}</span>
              ) : null}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {grupo.itens.length} item(ns)
            </span>
          </header>
          <div className="space-y-2.5">
            {grupo.itens.map((item) => (
              <CompromissoCard
                key={`${item.id}-${item.dataInicio}-${item.horaInicio}`}
                item={item}
                mostrarData={mostrarData}
                compacto={compacto}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
