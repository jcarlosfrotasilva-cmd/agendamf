"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PAPEIS } from "@/lib/constants-acesso";
import { CARGOS } from "@/lib/constants";
import { Field, inputClass, selectClass } from "./ui";

export type UsuarioItem = {
  id: number;
  nome: string;
  email: string;
  papel: string;
  cargo: string | null;
  ativo: boolean;
  ultimoAcesso: string | null;
  criadoEm: string;
};

const vazio = {
  id: 0,
  nome: "",
  email: "",
  senha: "",
  papel: "GESTAO",
  cargo: "",
  ativo: true,
};

export function UsuarioManager({
  usuarios,
  usuarioAtualId,
}: {
  usuarios: UsuarioItem[];
  usuarioAtualId: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ ...vazio });
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const editando = form.id > 0;

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setOk(null);
    setOcupado(true);
    const res = await fetch("/api/usuarios", {
      method: editando ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editando ? form.id : undefined,
        nome: form.nome,
        email: form.email,
        senha: form.senha || undefined,
        papel: form.papel,
        cargo: form.cargo,
        ativo: form.ativo,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setOcupado(false);
    if (!res.ok || !data.ok) {
      setErro(data.error ?? "Não foi possível salvar o usuário.");
      return;
    }
    setOk(editando ? "Usuário atualizado com sucesso." : "Usuário cadastrado com sucesso.");
    setForm({ ...vazio });
    router.refresh();
  }

  async function alternarAtivo(item: UsuarioItem) {
    setOcupado(true);
    setErro(null);
    const res = await fetch("/api/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, ativo: !item.ativo }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setOcupado(false);
    if (!res.ok || !data.ok) {
      setErro(data.error ?? "Não foi possível alterar o acesso.");
      return;
    }
    router.refresh();
  }

  async function excluir(id: number) {
    setOcupado(true);
    setErro(null);
    const res = await fetch(`/api/usuarios?id=${id}`, { method: "DELETE" });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setOcupado(false);
    if (!res.ok || !data.ok) {
      setErro(data.error ?? "Não foi possível excluir o usuário.");
      return;
    }
    router.refresh();
  }

  function editar(item: UsuarioItem) {
    setErro(null);
    setOk(null);
    setForm({
      id: item.id,
      nome: item.nome,
      email: item.email,
      senha: "",
      papel: item.papel,
      cargo: item.cargo ?? "",
      ativo: item.ativo,
    });
    globalThis.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <form onSubmit={salvar} className="card-surface h-fit p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          {editando ? "Editar usuário" : "Novo usuário da gestão"}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Defina quem pode entrar no sistema e o que cada pessoa pode fazer.
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Nome completo">
            <input
              className={inputClass}
              value={form.nome}
              onChange={(event) => setForm({ ...form, nome: event.target.value })}
              placeholder="Ex.: Mariana Albuquerque"
              required
            />
          </Field>
          <Field label="E-mail de acesso">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="gestao@escola.edu.br"
              required
              disabled={editando}
            />
          </Field>
          <Field
            label={editando ? "Nova senha (opcional)" : "Senha inicial"}
            hint={editando ? "Preencha apenas se quiser redefinir. Mín. 8 caracteres, com letras e números." : "Mínimo de 8 caracteres, com letras e números."}
          >
            <input
              type="password"
              className={inputClass}
              value={form.senha}
              onChange={(event) => setForm({ ...form, senha: event.target.value })}
              placeholder="••••••"
              minLength={8}
              required={!editando}
            />
          </Field>
          <Field label="Perfil de acesso">
            <select
              className={selectClass}
              value={form.papel}
              onChange={(event) => setForm({ ...form, papel: event.target.value })}
            >
              {PAPEIS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cargo na escola" hint="Opcional — ajuda na organização da agenda.">
            <select
              className={selectClass}
              value={form.cargo}
              onChange={(event) => setForm({ ...form, cargo: event.target.value })}
            >
              <option value="">Não informado</option>
              {CARGOS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200">
            {PAPEIS.find((p) => p.key === form.papel)?.descricao}
          </p>
        </div>

        {erro ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
            {erro}
          </p>
        ) : null}
        {ok ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            {ok}
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={ocupado}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {editando ? "Salvar alterações" : "Cadastrar usuário"}
          </button>
          {editando ? (
            <button
              type="button"
              onClick={() => setForm({ ...vazio })}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <div className="space-y-4">
        <section className="card-surface overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Usuários com acesso ({usuarios.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Você é {usuarios.find((u) => u.id === usuarioAtualId)?.nome ?? "usuário atual"}
            </span>
          </header>
          <div className="divide-y divide-slate-100">
            {usuarios.map((item) => {
              const papel = PAPEIS.find((p) => p.key === item.papel);
              const cargo = CARGOS.find((c) => c.key === item.cargo);
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {item.nome}
                      {item.id === usuarioAtualId ? (
                        <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          você
                        </span>
                      ) : null}
                      {!item.ativo ? (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          inativo
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {item.email}
                      {cargo ? ` · ${cargo.short}` : ""} ·{" "}
                      {item.ultimoAcesso
                        ? `último acesso ${new Date(item.ultimoAcesso).toLocaleString("pt-BR")}`
                        : "nunca acessou"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
                        papel?.chip ?? "bg-slate-100 text-slate-600 ring-slate-300"
                      }`}
                    >
                      {papel?.label ?? item.papel}
                    </span>
                    <button
                      type="button"
                      onClick={() => editar(item)}
                      className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => void alternarAtivo(item)}
                      className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {item.ativo ? "Bloquear acesso" : "Liberar acesso"}
                    </button>
                    {item.id !== usuarioAtualId ? (
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => void excluir(item.id)}
                        className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-60"
                      >
                        Excluir
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card-surface p-5">
          <h3 className="text-sm font-semibold text-slate-900">Como cada perfil acessa</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-800">🗂️ Gestão escolar</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Entra com e-mail e senha em <code>/entrar</code>. Cria compromissos, convoca
                professores, envia WhatsApp, dá baixa e acessa todos os relatórios.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-800">👁️ Consulta (somente leitura)</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Também entra por <code>/entrar</code>, mas apenas visualiza a agenda e os
                indicadores — sem permissão de alteração.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-800">👩‍🏫 Professor(a)</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Não usa e-mail nem senha: recebe um <strong>link pessoal</strong>{" "}
                (<code>/professor/&lt;código&gt;</code>) e vê somente a própria agenda, em modo
                leitura. Gere o link em <strong>Professores</strong> → “Copiar link de acesso”.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-800">🌐 Público externo</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                A consulta online (<code>/api/public/v1/agenda</code>) e o feed iCalendar seguem
                abertos e somente leitura, sem dados de contato — pensados para o portal da escola e
                a comunidade.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
