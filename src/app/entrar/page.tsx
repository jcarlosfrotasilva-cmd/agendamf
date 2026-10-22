import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { contarUsuarios, PAPEIS } from "@/lib/auth";
import { ESCOLA } from "@/lib/escola";

export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  // Se o banco oscilar, a tela continua abrindo com o formulário de login.
  let primeiroAcesso = false;
  let bancoIndisponivel = false;
  try {
    const existentes = await contarUsuarios();
    primeiroAcesso = existentes === 0;
  } catch {
    bancoIndisponivel = true;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-emerald-400 text-xs font-bold text-slate-900 shadow-lg">
            {ESCOLA.sigla}
          </span>
          <div>
            <p className="text-sm font-semibold">{ESCOLA.nome}</p>
            <p className="text-[11px] text-slate-400">{ESCOLA.sistema}</p>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-balance-tight">
            Agenda de compromissos da gestão escolar
          </h1>
          <p className="mt-3 max-w-md text-sm text-slate-300">
            Área de acesso da direção, vice-direção, coordenação de gestão pedagógica geral e
            gerência de organização escolar. Organize orientações pedagógicas, reuniões colegiadas e
            a agenda do corpo docente — com despertador de compromissos e consulta online.
          </p>

          <div className="mt-8 space-y-3">
            {PAPEIS.map((papel) => (
              <div key={papel.key} className="flex gap-3 rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10">
                <span className="mt-0.5 text-sm">{papel.key === "ADMIN" ? "🛡️" : papel.key === "GESTAO" ? "🗂️" : "👁️"}</span>
                <div>
                  <p className="text-xs font-semibold">{papel.label}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                    {papel.descricao}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-500">{ESCOLA.usoExclusivo}</p>
      </div>

      <div className="flex items-center justify-center bg-slate-50 px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 text-[10px] font-bold text-white">
              {ESCOLA.sigla}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{ESCOLA.nome}</p>
              <p className="text-[11px] text-slate-500">{ESCOLA.sistema}</p>
            </div>
          </div>

          <div className="card-surface p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
              {primeiroAcesso ? "Configuração inicial" : "Acesso da gestão"}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              {primeiroAcesso ? "Criar primeiro administrador" : "Entrar no sistema"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {primeiroAcesso
                ? "Esta tela aparece apenas uma vez, enquanto não houver usuários cadastrados."
                : "Use o e-mail e a senha cadastrados pela administração da escola."}
            </p>

            {bancoIndisponivel ? (
              <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[11px] font-medium leading-relaxed text-amber-800 ring-1 ring-amber-200">
                Instabilidade momentânea na conexão com o banco de dados. Tente entrar novamente em
                alguns segundos — se persistir, verifique a página de diagnóstico.
              </p>
            ) : null}

            <div className="mt-5">
              <Suspense fallback={<p className="text-xs text-slate-500">Carregando…</p>}>
                <LoginForm primeiroAcesso={primeiroAcesso} />
              </Suspense>
            </div>
          </div>

          <div className="mt-5 space-y-2 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Acesso do professor
            </p>
            <p className="text-[11px] leading-relaxed text-slate-600">
              O professor <strong>não</strong> entra por aqui. Cada docente recebe um link pessoal
              (enviado pela gestão) que abre somente a própria agenda, em modo leitura:{" "}
              <code className="rounded bg-slate-100 px-1">/professor/&lt;código&gt;</code>
            </p>
            <Link
              href="/consulta"
              className="inline-block text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Consulta pública da escola →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
