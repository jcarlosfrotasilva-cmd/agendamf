"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm({ primeiroAcesso }: { primeiroAcesso: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const inputClass =
    "w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500";

  async function entrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          senha,
          primeiroAcesso,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErro(data.error ?? "Não foi possível entrar.");
        setEntrando(false);
        return;
      }
      const proximo = params.get("proximo");
      router.replace(proximo && proximo.startsWith("/") ? proximo : "/");
      router.refresh();
    } catch {
      setErro("Falha de comunicação com o servidor.");
      setEntrando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="space-y-4">
      {primeiroAcesso ? (
        <>
          <div className="rounded-xl bg-amber-50 px-3.5 py-3 text-[11px] font-medium leading-relaxed text-amber-800 ring-1 ring-amber-200">
            <strong>Primeiro acesso do sistema.</strong> Nenhum usuário está cadastrado ainda. Crie
            o administrador da escola — este cadastro terá acesso total e poderá criar os demais
            usuários da equipe de gestão.
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Nome completo do administrador
            </span>
            <input
              className={inputClass}
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex.: Marlene Frattini"
              required
            />
          </label>
        </>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          E-mail institucional
        </span>
        <input
          type="email"
          className={inputClass}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="gestao@escola.edu.br"
          autoComplete="username"
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Senha
        </span>
        <input
          type="password"
          className={inputClass}
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          placeholder="mínimo de 8 caracteres, com letras e números"
          autoComplete={primeiroAcesso ? "new-password" : "current-password"}
          required
          minLength={8}
        />
      </label>

      {erro ? (
        <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={entrando}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {entrando
          ? "Verificando…"
          : primeiroAcesso
            ? "Criar administrador e entrar"
            : "Entrar na área da gestão"}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-slate-500">
        Acesso restrito à equipe de gestão da escola. Sessão válida por 12 horas; o sistema exige
        novo login depois desse período.
      </p>
    </form>
  );
}
