"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CARGOS,
  LEMBRETES,
  LOCAIS_SUGERIDOS,
  PRIORIDADES,
  STATUSES,
  TIPOS,
} from "@/lib/constants";
import { fmtDuracao, duracaoMinutos, isoToday } from "@/lib/datetime";
import { Field, inputClass, selectClass } from "./ui";

export type GestorOpcao = { id: number; nome: string; cargo: string };

export type ProfessorOpcao = {
  id: number;
  nome: string;
  disciplina: string | null;
  turmas: string | null;
  turno: string;
};

export type CompromissoFormValores = {
  id?: number;
  titulo: string;
  tipo: string;
  assunto: string;
  descricao: string;
  cargoResponsavel: string;
  gestorId: string;
  dataInicio: string;
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  local: string;
  participantes: string;
  prioridade: string;
  status: string;
  lembreteMinutos: string;
  despertadorAtivo: boolean;
  professorIds: number[];
};

function valoresIniciais(): CompromissoFormValores {
  const hoje = isoToday();
  return {
    titulo: "",
    tipo: "ORIENTACAO_PEDAGOGICA",
    assunto: "",
    descricao: "",
    cargoResponsavel: "COORDENADOR_PEDAGOGICO",
    gestorId: "",
    dataInicio: hoje,
    dataFim: hoje,
    horaInicio: "08:00",
    horaFim: "10:00",
    local: "",
    participantes: "",
    prioridade: "NORMAL",
    status: "AGENDADO",
    lembreteMinutos: "30",
    despertadorAtivo: true,
    professorIds: [],
  };
}

export function CompromissoForm({
  gestores,
  professores = [],
  inicial,
  modo,
}: {
  gestores: GestorOpcao[];
  professores?: ProfessorOpcao[];
  inicial?: Partial<CompromissoFormValores>;
  modo: "criar" | "editar";
}) {
  const router = useRouter();
  const [valores, setValores] = useState<CompromissoFormValores>(() => ({
    ...valoresIniciais(),
    ...inicial,
  }));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviarConvite, setEnviarConvite] = useState(false);
  const [avisoConvite, setAvisoConvite] = useState<string | null>(null);

  const set = <K extends keyof CompromissoFormValores>(
    chave: K,
    valor: CompromissoFormValores[K],
  ) => setValores((prev) => ({ ...prev, [chave]: valor }));

  const gestoresDoCargo = useMemo(
    () => gestores.filter((g) => g.cargo === valores.cargoResponsavel),
    [gestores, valores.cargoResponsavel],
  );

  const duracao = duracaoMinutos(
    valores.dataInicio,
    valores.dataFim,
    valores.horaInicio,
    valores.horaFim,
  );

  async function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setSalvando(true);

    const payload = {
      titulo: valores.titulo,
      tipo: valores.tipo,
      assunto: valores.assunto,
      descricao: valores.descricao,
      cargoResponsavel: valores.cargoResponsavel,
      gestorId: valores.gestorId ? Number(valores.gestorId) : null,
      dataInicio: valores.dataInicio,
      dataFim: valores.dataFim,
      horaInicio: valores.horaInicio,
      horaFim: valores.horaFim,
      local: valores.local,
      participantes: valores.participantes,
      prioridade: valores.prioridade,
      status: valores.status,
      lembreteMinutos: Number(valores.lembreteMinutos),
      despertadorAtivo: valores.despertadorAtivo,
      enviarConvite,
      professorIds: valores.professorIds,
    };

    try {
      const url =
        modo === "criar" ? "/api/compromissos" : `/api/compromissos/${valores.id}`;
      const res = await fetch(url, {
        method: modo === "criar" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        compromisso?: { id: number };
        convite?: { tentado: boolean; enviado: boolean; erro?: string } | null;
      };
      if (!res.ok || !data.ok) {
        setErro(data.error ?? "Não foi possível salvar o compromisso.");
        setSalvando(false);
        return;
      }
      const id = data.compromisso?.id ?? valores.id;

      if (data.convite?.tentado && !data.convite.enviado) {
        setAvisoConvite(
          `Compromisso salvo, mas o convite automático não foi enviado: ${
            data.convite.erro ?? "verifique a configuração do provedor de WhatsApp."
          } Abra o compromisso para enviar pelo link do WhatsApp.`,
        );
        setSalvando(false);
        globalThis.setTimeout(() => {
          router.push(`/compromissos/${id}#whatsapp`);
          router.refresh();
        }, 2600);
        return;
      }

      router.push(`/compromissos/${id}${data.convite?.enviado ? "#whatsapp" : ""}`);
      router.refresh();
    } catch {
      setErro("Falha de comunicação com o servidor. Tente novamente.");
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div className="card-surface p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-sm text-indigo-600">
            ①
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Identificação do compromisso</h2>
            <p className="text-xs text-slate-500">
              Título, tipo, assunto e descrição da orientação ou reunião da gestão.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2">
            <input
              className={inputClass}
              value={valores.titulo}
              onChange={(event) => set("titulo", event.target.value)}
              placeholder="Ex.: Orientação Pedagógica — Sequências didáticas de Matemática"
              required
            />
          </Field>

          <Field
            label="Tipo de compromisso"
            hint="Inclui as reuniões colegiadas: APM, Conselho de Escola e Grêmio Estudantil."
          >
            <select
              className={selectClass}
              value={valores.tipo}
              onChange={(event) => set("tipo", event.target.value)}
            >
              {TIPOS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Prioridade">
            <select
              className={selectClass}
              value={valores.prioridade}
              onChange={(event) => set("prioridade", event.target.value)}
            >
              {PRIORIDADES.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assunto" className="sm:col-span-2">
            <input
              className={inputClass}
              value={valores.assunto}
              onChange={(event) => set("assunto", event.target.value)}
              placeholder="Ex.: Alinhamento do plano de intervenção pedagógica por turma"
              required
            />
          </Field>

          <Field
            label="Descrição / pauta detalhada"
            className="sm:col-span-2"
            hint="Documentos a levar, pontos de pauta, encaminhamentos esperados."
          >
            <textarea
              className={`${inputClass} min-h-[104px] resize-y`}
              value={valores.descricao}
              onChange={(event) => set("descricao", event.target.value)}
              placeholder="Descreva a pauta e os encaminhamentos previstos."
            />
          </Field>
        </div>
      </div>

      <div className="card-surface p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-sm text-emerald-600">
            ②
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Data, hora, local e responsável
            </h2>
            <p className="text-xs text-slate-500">
              O compromisso pode se estender por vários dias (data de início e data fim).
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Data de início">
            <input
              type="date"
              className={inputClass}
              value={valores.dataInicio}
              onChange={(event) => set("dataInicio", event.target.value)}
              required
            />
          </Field>
          <Field label="Data fim">
            <input
              type="date"
              className={inputClass}
              value={valores.dataFim}
              onChange={(event) => set("dataFim", event.target.value)}
              required
            />
          </Field>
          <Field label="Hora de início">
            <input
              type="time"
              className={inputClass}
              value={valores.horaInicio}
              onChange={(event) => set("horaInicio", event.target.value)}
              required
            />
          </Field>
          <Field label="Hora final">
            <input
              type="time"
              className={inputClass}
              value={valores.horaFim}
              onChange={(event) => set("horaFim", event.target.value)}
              required
            />
          </Field>

          <Field label="Cargo responsável" className="sm:col-span-2">
            <select
              className={selectClass}
              value={valores.cargoResponsavel}
              onChange={(event) => {
                set("cargoResponsavel", event.target.value);
                set("gestorId", "");
              }}
            >
              {CARGOS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Gestor(a) responsável" className="sm:col-span-2" hint="Opcional, mas ajuda na organização por servidor.">
            <select
              className={selectClass}
              value={valores.gestorId}
              onChange={(event) => set("gestorId", event.target.value)}
            >
              <option value="">Selecione (opcional)</option>
              {gestoresDoCargo.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Local" className="sm:col-span-2">
            <input
              className={inputClass}
              list="locais-sugeridos"
              value={valores.local}
              onChange={(event) => set("local", event.target.value)}
              placeholder="Sala de Reuniões, Auditório, Google Meet..."
              required
            />
            <datalist id="locais-sugeridos">
              {LOCAIS_SUGERIDOS.map((local) => (
                <option key={local} value={local} />
              ))}
            </datalist>
          </Field>

          <Field
            label="Participantes / público (texto livre)"
            className="sm:col-span-2"
            hint="Use o campo abaixo para convocar professores nominalmente — eles recebem o compromisso na agenda própria."
          >
            <input
              className={inputClass}
              value={valores.participantes}
              onChange={(event) => set("participantes", event.target.value)}
              placeholder="Professores de Matemática, responsáveis do 8º ano..."
            />
          </Field>
        </div>

        {professores.length > 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Convocar professores ({valores.professorIds.length} selecionado(s))
                </p>
                <p className="text-[11px] text-slate-500">
                  Cada docente selecionado recebe o compromisso na agenda dele, com feed iCalendar e
                  aviso por WhatsApp.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set("professorIds", professores.map((p) => p.id))}
                  className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                >
                  Selecionar todos
                </button>
                <button
                  type="button"
                  onClick={() => set("professorIds", [])}
                  className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="mt-3 grid max-h-56 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {professores.map((professor) => {
                const marcado = valores.professorIds.includes(professor.id);
                return (
                  <button
                    key={professor.id}
                    type="button"
                    onClick={() =>
                      set(
                        "professorIds",
                        marcado
                          ? valores.professorIds.filter((id) => id !== professor.id)
                          : [...valores.professorIds, professor.id],
                      )
                    }
                    className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-left transition ring-1 ${
                      marcado
                        ? "bg-emerald-50 ring-emerald-300"
                        : "bg-white ring-slate-200 hover:ring-indigo-300"
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded text-[10px] font-bold text-white ${
                        marcado ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      {marcado ? "✓" : ""}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold text-slate-800">
                        {professor.nome}
                      </span>
                      <span className="block truncate text-[10px] text-slate-500">
                        {[professor.disciplina, professor.turmas].filter(Boolean).join(" · ") ||
                          "sem disciplina informada"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <Link
              href="/professores"
              className="mt-3 inline-block text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Gerenciar corpo docente →
            </Link>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] text-slate-600 ring-1 ring-slate-200">
            Nenhum professor cadastrado ainda.{" "}
            <Link href="/professores" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Cadastre o corpo docente
            </Link>{" "}
            para convocar professores neste compromisso — cada um recebe a própria agenda.
          </p>
        )}

        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600 ring-1 ring-slate-200">
          Duração estimada:{" "}
          <strong className="font-semibold text-slate-800">
            {duracao > 0 ? fmtDuracao(duracao) : "verifique as datas e horários informados"}
          </strong>
        </p>
      </div>

      <div className="card-surface p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-sm text-amber-600">
            ③
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Despertador e situação</h2>
            <p className="text-xs text-slate-500">
              Defina com quanta antecedência o sistema deve despertar a gestão.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Situação">
            <select
              className={selectClass}
              value={valores.status}
              onChange={(event) => set("status", event.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Antecedência do despertador">
            <select
              className={selectClass}
              value={valores.lembreteMinutos}
              onChange={(event) => set("lembreteMinutos", event.target.value)}
            >
              {LEMBRETES.map((minutos) => (
                <option key={minutos} value={minutos}>
                  {minutos < 60
                    ? `${minutos} minutos antes`
                    : minutos === 60
                      ? "1 hora antes"
                      : minutos === 1440
                        ? "1 dia antes"
                        : `${minutos / 60} horas antes`}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Despertador">
            <button
              type="button"
              onClick={() => set("despertadorAtivo", !valores.despertadorAtivo)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-inset transition ${
                valores.despertadorAtivo
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-slate-100 text-slate-500 ring-slate-200"
              }`}
            >
              {valores.despertadorAtivo ? "🔔 Ativado" : "🔕 Desativado"}
              <span
                className={`relative h-5 w-9 rounded-full transition ${
                  valores.despertadorAtivo ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                    valores.despertadorAtivo ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          </Field>
        </div>
      </div>

      {modo === "criar" ? (
        <button
          type="button"
          onClick={() => setEnviarConvite((v) => !v)}
          className={`flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left ring-1 ring-inset transition ${
            enviarConvite
              ? "bg-[#25D366]/10 ring-[#25D366]/40"
              : "bg-white ring-slate-200 hover:bg-slate-50"
          }`}
        >
          <span
            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px] font-bold text-white ${
              enviarConvite ? "bg-[#25D366]" : "bg-slate-300"
            }`}
          >
            {enviarConvite ? "✓" : ""}
          </span>
          <span>
            <span className="block text-xs font-semibold text-slate-800">
              Enviar o convite por WhatsApp automaticamente ao salvar
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              O sistema dispara a convocação para o responsável vinculado sem nenhum clique, usando
              o provedor de API configurado. O lembrete do despertador também é enviado
              automaticamente na antecedência definida.
            </span>
          </span>
        </button>
      ) : null}

      {avisoConvite ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
          {avisoConvite}
        </p>
      ) : null}

      {erro ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {erro}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {salvando ? "Salvando…" : modo === "criar" ? "Agendar compromisso" : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
