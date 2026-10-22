"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SENHA_MINIMA, forcaSenha, validarSenhaForte } from "@/lib/senha";

const inputClass =
  "w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500";

export function MinhaSenhaForm({ email, nome }: { email: string; nome: string }) {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  const forca = forcaSenha(novaSenha);
  const politica = novaSenha ? validarSenhaForte(novaSenha, { email, nome }) : null;

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setOk(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/senha", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha, confirmacao }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; mensagem?: string };
      if (!res.ok || !data.ok) {
        setErro(data.error ?? "Não foi possível alterar a senha.");
        setEnviando(false);
        return;
      }
      setOk(data.mensagem ?? "Senha alterada com sucesso.");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacao("");
      setEnviando(false);
      router.refresh();
    } catch {
      setErro("Falha de comunicação com o servidor.");
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200">
        Conta: <strong className="font-semibold text-slate-800">{email}</strong> · a senha é
        armazenada apenas como <strong>hash scrypt com salt único</strong> — nem a administração
        consegue lê-la.
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Senha atual
        </span>
        <input
          type={mostrar ? "text" : "password"}
          className={inputClass}
          value={senhaAtual}
          onChange={(event) => setSenhaAtual(event.target.value)}
          placeholder="senha em uso hoje"
          autoComplete="current-password"
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Nova senha
        </span>
        <input
          type={mostrar ? "text" : "password"}
          className={inputClass}
          value={novaSenha}
          onChange={(event) => setNovaSenha(event.target.value)}
          placeholder={`mínimo ${SENHA_MINIMA} caracteres, com letras e números`}
          autoComplete="new-password"
          minLength={SENHA_MINIMA}
          required
        />
      </label>

      {novaSenha ? (
        <div>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-slate-600">Força da senha</span>
            <span className="font-semibold text-slate-700">{forca.rotulo}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${forca.cor}`}
              style={{ width: `${(forca.nivel / 4) * 100}%` }}
            />
          </div>
          {politica && !politica.ok ? (
            <p className="mt-1 text-[11px] font-medium text-amber-700">{politica.mensagem}</p>
          ) : (
            <p className="mt-1 text-[11px] text-emerald-700">Senha atende à política.</p>
          )}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Confirmar nova senha
        </span>
        <input
          type={mostrar ? "text" : "password"}
          className={inputClass}
          value={confirmacao}
          onChange={(event) => setConfirmacao(event.target.value)}
          placeholder="repita a nova senha"
          autoComplete="new-password"
          minLength={SENHA_MINIMA}
          required
        />
        {confirmacao && confirmacao !== novaSenha ? (
          <span className="mt-1 block text-[11px] font-medium text-rose-600">
            As senhas não conferem.
          </span>
        ) : null}
      </label>

      <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
        <input
          type="checkbox"
          checked={mostrar}
          onChange={(event) => setMostrar(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
        />
        Mostrar as senhas enquanto digito
      </label>

      {erro ? (
        <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
          {erro}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          {ok}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando || (politica !== null && !politica.ok) || confirmacao !== novaSenha}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {enviando ? "Alterando…" : "Alterar minha senha"}
      </button>
    </form>
  );
}
