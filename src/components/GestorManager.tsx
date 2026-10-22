"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CARGOS, cargoInfo } from "@/lib/constants";
import { Field, inputClass, selectClass } from "./ui";

export type GestorItem = {
  id: number;
  nome: string;
  cargo: string;
  email: string | null;
  telefone: string | null;
  escola: string | null;
  ativo: boolean;
  totalCompromissos: number;
};

const vazio = {
  id: 0,
  nome: "",
  cargo: "COORDENADOR_PEDAGOGICO",
  email: "",
  telefone: "",
  escola: "",
  ativo: true,
};

export function GestorManager({ gestores }: { gestores: GestorItem[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...vazio });
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const editando = form.id > 0;

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setOcupado(true);
    const res = await fetch("/api/gestores", {
      method: editando ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editando ? form.id : undefined,
        nome: form.nome,
        cargo: form.cargo,
        email: form.email,
        telefone: form.telefone,
        escola: form.escola,
        ativo: form.ativo,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setOcupado(false);
    if (!res.ok || !data.ok) {
      setErro(data.error ?? "Não foi possível salvar o cadastro.");
      return;
    }
    setForm({ ...vazio });
    router.refresh();
  }

  async function excluir(id: number) {
    setOcupado(true);
    await fetch(`/api/gestores/${id}`, { method: "DELETE" });
    setOcupado(false);
    router.refresh();
  }

  function editar(item: GestorItem) {
    setErro(null);
    setForm({
      id: item.id,
      nome: item.nome,
      cargo: item.cargo,
      email: item.email ?? "",
      telefone: item.telefone ?? "",
      escola: item.escola ?? "",
      ativo: item.ativo,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <form onSubmit={salvar} className="card-surface h-fit p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          {editando ? "Editar cadastro de gestor" : "Cadastrar gestor da equipe"}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Diretor, vice-diretor, coordenador de gestão pedagógica geral e gerente de organização
          escolar.
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Nome completo">
            <input
              className={inputClass}
              value={form.nome}
              onChange={(event) => setForm({ ...form, nome: event.target.value })}
              placeholder="Ex.: Cláudia Nascimento"
              required
            />
          </Field>
          <Field label="Cargo">
            <select
              className={selectClass}
              value={form.cargo}
              onChange={(event) => setForm({ ...form, cargo: event.target.value })}
            >
              {CARGOS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="E-mail institucional">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="nome@escola.edu.br"
            />
          </Field>
          <Field label="Telefone / ramal">
            <input
              className={inputClass}
              value={form.telefone}
              onChange={(event) => setForm({ ...form, telefone: event.target.value })}
              placeholder="(11) 90000-0000"
            />
          </Field>
          <Field label="Unidade escolar">
            <input
              className={inputClass}
              value={form.escola}
              onChange={(event) => setForm({ ...form, escola: event.target.value })}
              placeholder="Escola Estadual ..."
            />
          </Field>
        </div>

        {erro ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
            {erro}
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={ocupado}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {editando ? "Salvar alterações" : "Cadastrar gestor"}
          </button>
          {editando ? (
            <button
              type="button"
              onClick={() => setForm({ ...vazio })}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              Cancelar edição
            </button>
          ) : null}
        </div>
      </form>

      <div className="space-y-4">
        {CARGOS.map((cargo) => {
          const doCargo = gestores.filter((g) => g.cargo === cargo.key);
          return (
            <section key={cargo.key} className="card-surface overflow-hidden">
              <header className={`flex items-center justify-between gap-3 bg-gradient-to-r ${cargo.accent} px-4 py-3 text-white`}>
                <div>
                  <h3 className="text-sm font-semibold">{cargo.label}</h3>
                  <p className="text-[11px] text-white/80">{cargo.descricao}</p>
                </div>
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold">
                  {doCargo.length}
                </span>
              </header>
              <div className="divide-y divide-slate-100">
                {doCargo.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-slate-500">
                    Nenhum gestor cadastrado neste cargo ainda.
                  </p>
                ) : (
                  doCargo.map((g) => (
                    <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {g.nome}
                          {!g.ativo ? (
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              inativo
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {[g.email, g.telefone, g.escola].filter(Boolean).join(" · ") ||
                            "Sem dados de contato"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {g.totalCompromissos} compromisso(s)
                        </span>
                        <button
                          type="button"
                          onClick={() => editar(g)}
                          className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void excluir(g.id)}
                          className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
        <p className="text-[11px] text-slate-400">
          Observação: os cargos seguem o organograma de gestão: {CARGOS.map((c) => c.label).join(" · ")}.
          O cargo {cargoInfo("COORDENADOR_PEDAGOGICO").sigla} acumula as orientações pedagógicas.
        </p>
      </div>
    </div>
  );
}
