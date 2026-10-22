import Link from "next/link";
import type { ReactNode } from "react";
import { ESCOLA } from "@/lib/escola";
import { NavLinks } from "./NavLinks";
import { BotaoSair } from "./BotaoSair";

export type UsuarioSessao = {
  nome: string;
  email: string;
  papel: "ADMIN" | "GESTAO" | "LEITURA";
} | null;

export function Shell({
  children,
  usuario,
}: {
  children: ReactNode;
  usuario?: UsuarioSessao;
}) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="relative hidden w-[286px] shrink-0 flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div>
          <Link href="/" className="flex items-center gap-3 px-2">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-emerald-400 text-[11px] font-bold leading-tight text-slate-900 shadow-lg">
              {ESCOLA.sigla}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight text-white">
                {ESCOLA.nome}
              </span>
              <span className="block text-[11px] text-slate-400">{ESCOLA.sistema}</span>
            </span>
          </Link>

          <div className="mt-7">
            <NavLinks papel={usuario?.papel} />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {usuario ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Sessão ativa
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-white">{usuario.nome}</p>
              <p className="truncate text-[10px] text-slate-400">{usuario.email}</p>
              <Link
                href="/minha-senha"
                className="mt-1.5 inline-block text-[10px] font-semibold text-indigo-300 hover:text-indigo-200"
              >
                🔑 Minha senha
              </Link>
              <BotaoSair papel={usuario.papel} />
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-[11px] leading-relaxed text-slate-300">
          <p className="font-semibold text-white">Banco interno + consulta externa</p>
          <p className="mt-1 text-slate-400">
            PostgreSQL no Supabase com API pública somente-leitura e feed iCalendar para Google
            Agenda e Outlook.
          </p>
            <Link
              href="/configuracao"
              className="mt-2 inline-flex items-center gap-1 font-semibold text-emerald-300 hover:text-emerald-200"
            >
              Configuração do banco →
            </Link>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 text-[10px] font-bold text-white">
              {ESCOLA.sigla}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{ESCOLA.nome}</p>
              <p className="truncate text-[11px] text-slate-500">{ESCOLA.sistema}</p>
            </div>
          </div>
          <div className="mt-3">
            <NavLinks variant="mobile" papel={usuario?.papel} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:py-9">{children}</main>

        <footer className="mx-auto w-full max-w-[1240px] px-4 pb-10 text-center text-[11px] text-slate-400 sm:px-6">
          {ESCOLA.nomeCompleto} · {ESCOLA.sistema} · PostgreSQL (Supabase) · Drizzle ORM · Consulta
          online via API REST e iCalendar
          <span className="mt-1 block">{ESCOLA.usoExclusivo}</span>
        </footer>
      </div>
    </div>
  );
}
