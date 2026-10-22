"use client";

import { useState } from "react";

export function CopyBlock({
  conteudo,
  titulo,
  linhas = 14,
}: {
  conteudo: string;
  titulo?: string;
  linhas?: number;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(conteudo);
      setCopiado(true);
      globalThis.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-800">
      <div className="flex items-center justify-between gap-2 bg-slate-800 px-3 py-2">
        <span className="font-mono text-[11px] font-semibold text-slate-200">
          {titulo ?? "SQL / comando"}
        </span>
        <button
          type="button"
          onClick={() => void copiar()}
          className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-white/20"
        >
          {copiado ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <textarea
        readOnly
        value={conteudo}
        rows={linhas}
        spellCheck={false}
        onFocus={(event) => event.currentTarget.select()}
        className="w-full resize-y bg-slate-950 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-emerald-300 outline-none"
      />
    </div>
  );
}
