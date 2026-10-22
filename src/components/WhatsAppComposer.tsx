"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FINALIDADES, finalidadeInfo } from "@/lib/whatsapp";
import { selectClass } from "./ui";

export type DestinatarioOpcao = {
  id: number | null;
  nome: string;
  cargo: string;
  telefone: string | null;
  rotulo: string;
};

export type MensagemRegistrada = {
  id: number;
  destinoNome: string;
  destinoTelefone: string;
  finalidade: string;
  status: string;
  canal: string;
  erro: string | null;
  criadoEm: string;
  enviadoEm: string | null;
  mensagem: string;
};

const STATUS_CHIP: Record<string, string> = {
  ENVIADO: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  GERADO: "bg-amber-50 text-amber-700 ring-amber-200",
  FALHA: "bg-rose-50 text-rose-700 ring-rose-200",
  CANCELADO: "bg-slate-100 text-slate-600 ring-slate-300",
};

const STATUS_LABEL: Record<string, string> = {
  ENVIADO: "Enviada",
  GERADO: "Gerada (envio manual)",
  FALHA: "Falha no envio",
  CANCELADO: "Cancelada",
};

export function WhatsAppComposer({
  compromissoId,
  compromissoTitulo,
  destinatarios,
  modelos,
  historico,
  apiAutomatica,
  compacto = false,
}: {
  compromissoId: number;
  compromissoTitulo: string;
  destinatarios: DestinatarioOpcao[];
  modelos: Record<string, string>;
  historico: MensagemRegistrada[];
  apiAutomatica: boolean;
  compacto?: boolean;
}) {
  const router = useRouter();
  const iniciais = destinatarios[0] ?? null;
  const [destinatarioId, setDestinatarioId] = useState<string>(
    iniciais?.id ? String(iniciais.id) : iniciais ? "avulso" : "avulso",
  );
  const [telefoneAvulso, setTelefoneAvulso] = useState(
    iniciais && !iniciais.id ? (iniciais.telefone ?? "") : "",
  );
  const [nomeAvulso, setNomeAvulso] = useState(
    iniciais && !iniciais.id ? iniciais.nome : "",
  );
  const [finalidade, setFinalidade] = useState("CONVITE");
  const [editada, setEditada] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimoRegistro, setUltimoRegistro] = useState<MensagemRegistrada | null>(null);
  const [abertoHistorico, setAbertoHistorico] = useState(false);

  const destinatarioAtual = useMemo(() => {
    if (destinatarioId === "avulso") {
      return {
        id: null as number | null,
        nome: nomeAvulso || "Responsável",
        telefone: telefoneAvulso || null,
      };
    }
    const encontrado = destinatarios.find((d) => String(d.id) === destinatarioId);
    return encontrado
      ? { id: encontrado.id, nome: encontrado.nome, telefone: encontrado.telefone }
      : { id: null, nome: "Responsável", telefone: null };
  }, [destinatarioId, destinatarios, nomeAvulso, telefoneAvulso]);

  const mensagem = useMemo(() => {
    if (editada !== null) return editada;
    const modelo = modelos[finalidade] ?? "";
    return modelo.replace(/\{\{nome\}\}/g, destinatarioAtual.nome.split(" ")[0] || "colega");
  }, [editada, finalidade, modelos, destinatarioAtual.nome]);

  const trocarFinalidade = (valor: string) => {
    setFinalidade(valor);
    setEditada(null);
    setErro(null);
  };

  const trocarDestinatario = (valor: string) => {
    setDestinatarioId(valor);
    setEditada(null);
    setErro(null);
  };

  const preparar = useCallback(
    async (enviar: boolean) => {
      setOcupado(true);
      setErro(null);
      setAviso(null);
      try {
        const res = await fetch("/api/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            compromissoId,
            gestorId: destinatarioAtual.id,
            destinoNome: destinatarioAtual.nome,
            telefone: destinatarioAtual.telefone,
            finalidade,
            mensagem,
            enviar,
          }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          link?: string | null;
          registro?: MensagemRegistrada | null;
          status?: string;
          erro?: string;
          automatico?: boolean;
        };
        if (!res.ok || !data.ok) {
          setErro(data.error ?? "Não foi possível preparar a mensagem.");
          return;
        }
        setUltimoRegistro(data.registro ?? null);

        if (enviar && data.status === "ENVIADO") {
          setAviso(`Mensagem enviada automaticamente para ${destinatarioAtual.nome}.`);
          router.refresh();
          return;
        }

        if (enviar && data.status === "FALHA") {
          setErro(data.erro ?? "Falha no envio automático. Use o link para envio manual.");
        }

        if (data.link) {
          window.open(data.link, "_blank", "noopener,noreferrer");
          setAviso(
            "WhatsApp aberto em nova aba com a mensagem pronta. Confirme o envio e marque como enviada abaixo.",
          );
        } else {
          setAviso("Mensagem gerada e registrada. Copie o texto e envie pelo WhatsApp.");
        }
        router.refresh();
      } catch {
        setErro("Falha de comunicação com o servidor.");
      } finally {
        setOcupado(false);
      }
    },
    [compromissoId, destinatarioAtual, finalidade, mensagem, router],
  );

  const confirmarEnvio = useCallback(async () => {
    if (!ultimoRegistro) return;
    setOcupado(true);
    await fetch(`/api/whatsapp/${ultimoRegistro.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ENVIADO" }),
    });
    setOcupado(false);
    setAviso("Envio confirmado e registrado no histórico.");
    setUltimoRegistro(null);
    router.refresh();
  }, [ultimoRegistro, router]);

  const copiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mensagem);
      setAviso("Mensagem copiada para a área de transferência.");
    } catch {
      setErro("Não foi possível copiar automaticamente. Selecione o texto manualmente.");
    }
  }, [mensagem]);

  const semTelefone = !destinatarioAtual.telefone;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Destinatário
          </span>
          <select
            className={selectClass}
            value={destinatarioId}
            onChange={(event) => trocarDestinatario(event.target.value)}
          >
            {destinatarios.map((d) => (
              <option key={`${d.id ?? "avulso"}-${d.nome}`} value={d.id ? String(d.id) : "avulso"}>
                {d.rotulo}
                {d.telefone ? "" : " — sem telefone"}
              </option>
            ))}
            <option value="avulso">Outro número (informar manualmente)</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Finalidade da mensagem
          </span>
          <select
            className={selectClass}
            value={finalidade}
            onChange={(event) => trocarFinalidade(event.target.value)}
          >
            {FINALIDADES.map((f) => (
              <option key={f.key} value={f.key}>
                {f.emoji} {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {destinatarioId === "avulso" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Nome do contato
            </span>
            <input
              className="w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
              value={nomeAvulso}
              onChange={(event) => setNomeAvulso(event.target.value)}
              placeholder="Ex.: Ana Paula (representante da APM)"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              WhatsApp (com DDD)
            </span>
            <input
              className="w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
              value={telefoneAvulso}
              onChange={(event) => setTelefoneAvulso(event.target.value)}
              placeholder="(11) 98812-4477"
              inputMode="tel"
            />
          </label>
        </div>
      ) : null}

      {semTelefone && destinatarioId !== "avulso" ? (
        <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
          Este gestor ainda não tem telefone cadastrado. Cadastre em <strong>Gestores</strong> com
          DDD + número, ou use a opção “Outro número”.
        </p>
      ) : null}

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Mensagem ({mensagem.length} caracteres)
          </span>
          <button
            type="button"
            onClick={() => setEditada(null)}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Restaurar texto padrão
          </button>
        </div>
        <textarea
          value={mensagem}
          onChange={(event) => setEditada(event.target.value)}
          rows={compacto ? 10 : 14}
          className="w-full resize-y rounded-xl border-0 bg-white px-3 py-2.5 font-mono text-[11px] leading-relaxed text-slate-800 ring-1 ring-inset ring-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-1 text-[11px] text-slate-500">
          {finalidadeInfo(finalidade).descricao} O texto pode ser ajustado antes do envio — a versão
          enviada fica registrada no histórico.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={ocupado || semTelefone}
          onClick={() => void preparar(false)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
        >
          <span aria-hidden>🟢</span>
          {ocupado ? "Preparando…" : "Enviar pelo WhatsApp"}
        </button>
        {apiAutomatica ? (
          <button
            type="button"
            disabled={ocupado || semTelefone}
            onClick={() => void preparar(true)}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            ⚡ Enviar automaticamente (Cloud API)
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void copiar()}
          className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50"
        >
          Copiar mensagem
        </button>
        {ultimoRegistro && ultimoRegistro.status === "GERADO" ? (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void confirmarEnvio()}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            ✓ Marcar como enviada
          </button>
        ) : null}
      </div>

      {aviso ? (
        <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200">
          {aviso}
        </p>
      ) : null}
      {erro ? (
        <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200">
          {erro}
        </p>
      ) : null}
      {!apiAutomatica ? (
        <p className="text-[11px] text-slate-500">
          Envio manual pelo WhatsApp Web/app (link direto com o texto pronto). Para envio automático
          sem intervenção, configure as variáveis <code>WHATSAPP_TOKEN</code> e{" "}
          <code>WHATSAPP_PHONE_ID</code> — a página <strong>Banco de Dados</strong> explica o passo a
          passo.
        </p>
      ) : null}

      <div className="border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setAbertoHistorico((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="text-xs font-semibold text-slate-800">
            Histórico de comunicações
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {historico.length}
            </span>
          </span>
          <span className="text-[11px] font-semibold text-indigo-600">
            {abertoHistorico ? "ocultar ▲" : "ver ▼"}
          </span>
        </button>

        {abertoHistorico ? (
          <ul className="mt-3 space-y-2">
            {historico.length === 0 ? (
              <li className="rounded-lg bg-slate-50 px-3 py-3 text-[11px] text-slate-500">
                Nenhuma mensagem registrada para o compromisso “{compromissoTitulo}”.
              </li>
            ) : (
              historico.map((item) => {
                const info = finalidadeInfo(item.finalidade);
                return (
                  <li key={item.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                          STATUS_CHIP[item.status] ?? STATUS_CHIP.GERADO
                        }`}
                      >
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                        {info.emoji} {info.label}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {item.canal === "API" ? "automático" : "manual"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] font-semibold text-slate-700">
                      {item.destinoNome} · {item.destinoTelefone}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(item.criadoEm).toLocaleString("pt-BR")}
                      {item.enviadoEm
                        ? ` · enviada em ${new Date(item.enviadoEm).toLocaleString("pt-BR")}`
                        : ""}
                    </p>
                    {item.erro ? (
                      <p className="mt-1 text-[10px] font-medium text-rose-600">{item.erro}</p>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>

      <p className="text-[11px] text-slate-400">
        Responsável vinculado: {destinatarioAtual.nome}
        {destinatarioAtual.id ? "" : " (contato manual)"} ·{" "}
        {destinatarioAtual.telefone
          ? destinatarioAtual.telefone
          : "telefone não informado"}
      </p>
    </div>
  );
}
