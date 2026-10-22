"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TIPOS_DOCENTES, TURNOS, tipoInfo } from "@/lib/constants";
import { Field, inputClass, selectClass } from "./ui";

export type ProfessorItem = {
  id: number;
  nome: string;
  disciplina: string | null;
  turmas: string | null;
  turno: string;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
  ativo: boolean;
  totalCompromissos: number;
  tokenAcesso: string | null;
};

const vazio = {
  id: 0,
  nome: "",
  disciplina: "",
  turmas: "",
  turno: "MANHA",
  email: "",
  telefone: "",
  observacoes: "",
  ativo: true,
};

export function ProfessorManager({ professores }: { professores: ProfessorItem[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...vazio });
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [links, setLinks] = useState<Record<number, string>>({});
  const editando = form.id > 0;

  const linkDoProfessor = (item: ProfessorItem) => {
    const token = links[item.id] ?? item.tokenAcesso;
    return token ? `${globalThis.location.origin}/professor/${token}` : null;
  };

  async function gerarLink(item: ProfessorItem, renovar = false) {
    setOcupado(true);
    setErro(null);
    const res = await fetch(`/api/professores/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renovar }),
    });
    const data = (await res.json()) as { ok: boolean; caminho?: string; error?: string };
    setOcupado(false);
    if (!res.ok || !data.ok) {
      setErro(data.error ?? "Não foi possível gerar o link de acesso.");
      return;
    }
    const completo = `${globalThis.location.origin}${data.caminho}`;
    setLinks((prev) => ({ ...prev, [item.id]: data.caminho?.replace("/professor/", "") ?? "" }));
    try {
      await navigator.clipboard.writeText(completo);
      setCopiado(item.id);
      globalThis.setTimeout(() => setCopiado(null), 3000);
    } catch {
      setErro("Link gerado. Copie manualmente: " + completo);
    }
    router.refresh();
  }

  async function avisarProfessor(item: ProfessorItem, tipo: "CONVITE" | "LEMBRETE") {
    if (!item.totalCompromissos) {
      setErro("Este professor ainda não possui convocações na agenda.");
      return;
    }
    const token = links[item.id] ?? item.tokenAcesso;
    setOcupado(true);
    const compromissos = await fetch(`/api/compromissos?professorId=${item.id}&periodo=PROXIMOS7`)
      .then((r) => r.json() as Promise<{ itens?: { id: number }[] }>)
      .catch(() => ({ itens: [] as { id: number }[] }));
    const primeiro = compromissos.itens?.[0];
    if (!primeiro) {
      setOcupado(false);
      setErro("Nenhum compromisso futuro do professor nos próximos 7 dias.");
      return;
    }
    const texto = token
      ? ` Olá! Sua agenda individual está em: ${globalThis.location.origin}/professor/${token}`
      : "";
    const res = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compromissoId: primeiro.id,
        destinoNome: item.nome,
        telefone: item.telefone,
        finalidade: tipo,
        ...(texto ? { mensagem: undefined } : {}),
      }),
    });
    const data = (await res.json()) as { ok: boolean; link?: string; error?: string };
    setOcupado(false);
    if (!res.ok || !data.ok) {
      setErro(data.error ?? "Não foi possível preparar a mensagem.");
      return;
    }
    if (data.link) globalThis.open(data.link, "_blank", "noopener,noreferrer");
    router.refresh();
  }

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setOcupado(true);
    const res = await fetch("/api/professores", {
      method: editando ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editando ? form.id : undefined,
        nome: form.nome,
        disciplina: form.disciplina,
        turmas: form.turmas,
        turno: form.turno,
        email: form.email,
        telefone: form.telefone,
        observacoes: form.observacoes,
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
    await fetch(`/api/professores/${id}`, { method: "DELETE" });
    setOcupado(false);
    router.refresh();
  }

  function editar(item: ProfessorItem) {
    setErro(null);
    setForm({
      id: item.id,
      nome: item.nome,
      disciplina: item.disciplina ?? "",
      turmas: item.turmas ?? "",
      turno: item.turno,
      email: item.email ?? "",
      telefone: item.telefone ?? "",
      observacoes: item.observacoes ?? "",
      ativo: item.ativo,
    });
    globalThis.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copiarLink(item: ProfessorItem) {
    const url = `${globalThis.location.origin}/api/professores/${item.id}/ics`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(item.id);
      globalThis.setTimeout(() => setCopiado(null), 2500);
    } catch {
      setErro("Não foi possível copiar o endereço da agenda.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <form onSubmit={salvar} className="card-surface h-fit p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          {editando ? "Editar professor(a)" : "Cadastrar professor(a)"}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          O professor passa a ter agenda própria: você o convoca para orientações, HTPC, conselhos
          de classe e reuniões de pais.
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Nome completo">
            <input
              className={inputClass}
              value={form.nome}
              onChange={(event) => setForm({ ...form, nome: event.target.value })}
              placeholder="Ex.: Ana Paula Ferreira"
              required
            />
          </Field>
          <Field label="Disciplina / componente">
            <input
              className={inputClass}
              value={form.disciplina}
              onChange={(event) => setForm({ ...form, disciplina: event.target.value })}
              placeholder="Matemática, Língua Portuguesa, Educação Física..."
            />
          </Field>
          <Field label="Turmas / anos">
            <input
              className={inputClass}
              value={form.turmas}
              onChange={(event) => setForm({ ...form, turmas: event.target.value })}
              placeholder="6º A, 7º B, 8º A"
            />
          </Field>
          <Field label="Turno">
            <select
              className={selectClass}
              value={form.turno}
              onChange={(event) => setForm({ ...form, turno: event.target.value })}
            >
              {TURNOS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="WhatsApp (com DDD)" hint="Necessário para avisos automáticos.">
            <input
              className={inputClass}
              value={form.telefone}
              onChange={(event) => setForm({ ...form, telefone: event.target.value })}
              placeholder="(11) 98812-4477"
              inputMode="tel"
            />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="professor@escola.edu.br"
            />
          </Field>
          <Field label="Observações">
            <textarea
              className={`${inputClass} min-h-[70px] resize-y`}
              value={form.observacoes}
              onChange={(event) => setForm({ ...form, observacoes: event.target.value })}
              placeholder="Aulas em outras unidades, restrições de horário, etc."
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
            {editando ? "Salvar alterações" : "Cadastrar professor(a)"}
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

        <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Tipos usados na agenda docente
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TIPOS_DOCENTES.map((chave) => {
              const info = tipoInfo(chave);
              return (
                <span
                  key={chave}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${info.chip}`}
                >
                  {info.label}
                </span>
              );
            })}
          </div>
        </div>
      </form>

      <div className="space-y-4">
        {TURNOS.map((turno) => {
          const doTurno = professores.filter((p) => p.turno === turno.key);
          if (doTurno.length === 0 && professores.length > 0) return null;
          return (
            <section key={turno.key} className="card-surface overflow-hidden">
              <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold ${turno.chip}`}
                  >
                    {turno.sigla}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900">Turno da {turno.label}</h3>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  {doTurno.length} professor(es)
                </span>
              </header>
              <div className="divide-y divide-slate-100">
                {doTurno.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-slate-500">
                    Nenhum professor cadastrado neste turno.
                  </p>
                ) : (
                  doTurno.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {p.nome}
                          {!p.ativo ? (
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              inativo
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {[p.disciplina, p.turmas, p.telefone].filter(Boolean).join(" · ") ||
                            "Sem dados complementares"}
                        </p>
                        {linkDoProfessor(p) ? (
                          <p className="mt-0.5 max-w-[320px] truncate font-mono text-[10px] text-indigo-600">
                            {linkDoProfessor(p)}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Sem link de acesso — clique em “Gerar link”
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {p.totalCompromissos} convocação(ões)
                        </span>
                        <Link
                          href={`/professores/${p.id}`}
                          className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700"
                        >
                          Abrir agenda
                        </Link>
                        <button
                          type="button"
                          onClick={() => void copiarLink(p)}
                          className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                          {copiado === p.id ? "✓ Copiado" : "Feed .ics"}
                        </button>
                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() => void gerarLink(p, Boolean(p.tokenAcesso))}
                          title="Gera (ou renova) o link pessoal de leitura da agenda do professor"
                          className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100 disabled:opacity-60"
                        >
                          {p.tokenAcesso ? "🔗 Link de acesso" : "🔗 Gerar link"}
                        </button>
                        {p.telefone ? (
                          <button
                            type="button"
                            disabled={ocupado}
                            onClick={() => void avisarProfessor(p, "CONVITE")}
                            title="Abre o WhatsApp do professor com o aviso"
                            className="rounded-lg bg-[#25D366]/12 px-2.5 py-1.5 text-[11px] font-semibold text-[#128C7E] ring-1 ring-[#25D366]/30 hover:bg-[#25D366]/20 disabled:opacity-60"
                          >
                            💬 Avisar
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => editar(p)}
                          className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void excluir(p.id)}
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

        {professores.length === 0 ? (
          <div className="card-surface p-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-2xl">👩‍🏫</span>
              <p className="text-sm font-semibold text-slate-800">
                Nenhum professor cadastrado ainda
              </p>
              <p className="max-w-md text-xs text-slate-500">
                Cadastre o corpo docente para convocar professores nas orientações pedagógicas,
                HTPC, conselhos de classe e reuniões de pais. Cada professor recebe a própria agenda
                com feed iCalendar e avisos por WhatsApp.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">
            Turnos: {TURNOS.map((t) => t.label).join(" · ")}. A agenda individual de cada professor é
            somente-leitura para o docente (link do feed iCalendar + avisos por WhatsApp), enquanto a
            gestão permanece com o controle total da agenda.
          </p>
        )}
      </div>
    </div>
  );
}
