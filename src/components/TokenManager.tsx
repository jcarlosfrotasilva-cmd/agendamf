"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, inputClass } from "./ui";

export type TokenItem = {
  id: number;
  nome: string;
  orgao: string | null;
  ativo: boolean;
  criadoEm: string;
  tokenMascarado: string;
};

export function TokenManager({ tokens }: { tokens: TokenItem[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [orgao, setOrgao] = useState("");
  const [novo, setNovo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function criar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, orgao }),
    });
    const data = (await res.json()) as { ok: boolean; token?: string; error?: string };
    if (!res.ok || !data.ok) {
      setErro(data.error ?? "Não foi possível gerar a chave.");
      return;
    }
    setNovo(data.token ?? null);
    setNome("");
    setOrgao("");
    router.refresh();
  }

  async function alternar(item: TokenItem) {
    await fetch(`/api/tokens/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !item.ativo }),
    });
    router.refresh();
  }

  async function excluir(id: number) {
    await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function copiar(valor: string) {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(valor);
      globalThis.setTimeout(() => setCopiado(null), 2500);
    } catch {
      setErro("Não foi possível copiar automaticamente. Selecione o texto manualmente.");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={criar} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Identificação da integração">
          <input
            className={inputClass}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Portal da Secretaria / Power BI"
            required
          />
        </Field>
        <Field label="Órgão ou unidade">
          <input
            className={inputClass}
            value={orgao}
            onChange={(event) => setOrgao(event.target.value)}
            placeholder="Diretoria Regional de Ensino"
          />
        </Field>
        <button
          type="submit"
          className="h-[38px] rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white transition hover:bg-indigo-700"
        >
          Gerar chave
        </button>
      </form>

      {erro ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
          {erro}
        </p>
      ) : null}

      {novo ? (
        <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <p className="text-xs font-semibold text-emerald-800">
            Chave gerada — copie agora, ela não será exibida novamente:
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="max-w-full overflow-x-auto rounded-lg bg-white px-3 py-1.5 font-mono text-[11px] text-slate-800 ring-1 ring-emerald-200">
              {novo}
            </code>
            <button
              type="button"
              onClick={() => void copiar(novo)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
            >
              {copiado === novo ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Integração</th>
              <th className="px-3 py-2.5 font-semibold">Chave</th>
              <th className="px-3 py-2.5 font-semibold">Situação</th>
              <th className="px-3 py-2.5 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {tokens.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                  Nenhuma chave criada. A API pública funciona em modo aberto (campos resumidos).
                </td>
              </tr>
            ) : (
              tokens.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-800">{item.nome}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.orgao ?? "—"} · {new Date(item.criadoEm).toLocaleDateString("pt-BR")}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                    {item.tokenMascarado}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                        item.ativo
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-slate-100 text-slate-500 ring-slate-200"
                      }`}
                    >
                      {item.ativo ? "ativa" : "revogada"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => void alternar(item)}
                      className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      {item.ativo ? "Revogar" : "Reativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void excluir(item.id)}
                      className="ml-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
