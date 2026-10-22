"use client";

import { useEffect } from "react";

/**
 * Tela de erro amigável. Evita a mensagem genérica "server error" e oferece
 * recuperação sem perder o contexto do usuário.
 */
export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[agenda] erro na interface:", error.message);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card-surface w-full max-w-lg p-7 text-center">
        <span className="text-4xl">🛠️</span>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
          Não foi possível concluir a operação
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Ocorreu uma instabilidade momentânea ao consultar a agenda. Seus dados estão salvos no
          banco — tente novamente em alguns segundos.
        </p>
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-500 ring-1 ring-slate-200">
          {error.message || "erro inesperado"}
          {error.digest ? ` · código ${error.digest}` : ""}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            Voltar ao painel
          </a>
          <a
            href="/api/health"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            Ver diagnóstico
          </a>
        </div>
      </div>
    </div>
  );
}
