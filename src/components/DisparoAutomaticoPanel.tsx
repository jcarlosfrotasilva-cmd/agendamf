"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

type Detalhe = {
  compromissoId: number;
  titulo: string;
  finalidade: string;
  destino: string | null;
  telefone: string | null;
  status: string;
  motivo?: string;
};

type Resultado = {
  ok: boolean;
  provedor?: string | null;
  provedorDescricao?: string;
  automatico?: boolean;
  simulacao?: boolean;
  convitesEnviados?: number;
  lembretesEnviados?: number;
  alteracoesEnviadas?: number;
  falhas?: number;
  ignorados?: number;
  pendentes?: number;
  detalhes?: Detalhe[];
  erro?: string;
};

const FINALIDADE_LABEL: Record<string, string> = {
  CONVITE: "📩 convite",
  LEMBRETE: "⏰ lembrete",
  ALTERACAO: "🔁 alteração",
  CANCELAMENTO: "🚫 cancelamento",
  CONFIRMACAO: "✅ confirmação",
  AGRADECIMENTO: "🙏 registro",
};

export function DisparoAutomaticoPanel({
  provedorConfigurado,
  provedorDescricao,
  conviteAutomatico,
  cronSecretDefinido,
  urlDisparo,
  pendentes,
}: {
  provedorConfigurado: boolean;
  provedorDescricao: string;
  conviteAutomatico: boolean;
  cronSecretDefinido: boolean;
  urlDisparo: string;
  pendentes: number;
}) {
  const router = useRouter();
  const [executando, setExecutando] = useState(false);
  const [simulando, setSimulando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [telefoneTeste, setTelefoneTeste] = useState("");
  const [mensagemTeste, setMensagemTeste] = useState<string | null>(null);
  const [erroTeste, setErroTeste] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const executar = useCallback(
    async (simulacao: boolean) => {
      simulacao ? setSimulando(true) : setExecutando(true);
      setResultado(null);
      try {
        const res = await fetch(
          `/api/whatsapp/automatico?somente=todos${simulacao ? "&simulacao=true" : ""}&origem=interface`,
          { method: "POST", headers: { "x-interno": "1" } },
        );
        const data = (await res.json()) as Resultado;
        setResultado(data);
        router.refresh();
      } catch {
        setResultado({ ok: false, erro: "Falha de comunicação ao executar o disparo." });
      } finally {
        setExecutando(false);
        setSimulando(false);
      }
    },
    [router],
  );

  const testar = useCallback(async () => {
    setTestando(true);
    setMensagemTeste(null);
    setErroTeste(null);
    try {
      const res = await fetch("/api/whatsapp/teste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: telefoneTeste }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; erro?: string };
      if (!res.ok || !data.ok) {
        setErroTeste(data.error ?? data.erro ?? "Falha no teste de envio.");
      } else {
        setMensagemTeste("Mensagem de teste enviada com sucesso — confira o WhatsApp informado.");
        router.refresh();
      }
    } catch {
      setErroTeste("Falha de comunicação com o servidor.");
    } finally {
      setTestando(false);
    }
  }, [telefoneTeste, router]);

  const copiarUrl = async () => {
    try {
      await navigator.clipboard.writeText(urlDisparo);
      setCopiado(true);
      globalThis.setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* ignora */
    }
  };

  return (
    <div className="card-surface overflow-hidden">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
          provedorConfigurado
            ? "bg-gradient-to-r from-emerald-600 to-teal-600"
            : "bg-gradient-to-r from-slate-800 to-slate-700"
        } text-white`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{provedorConfigurado ? "⚡" : "🔌"}</span>
          <div>
            <p className="text-sm font-semibold">
              Disparo automático {provedorConfigurado ? "ATIVO" : "não configurado"}
            </p>
            <p className="text-[11px] text-white/85">
              {provedorConfigurado
                ? `Envio sem clique: ${provedorDescricao}`
                : "Configure um provedor de API do WhatsApp para o sistema enviar sozinho"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
            {pendentes} lembrete(s) na fila
          </span>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
            {cronSecretDefinido ? "agendador protegido" : "agendador aberto"}
          </span>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={executando || simulando}
            onClick={() => void executar(false)}
            className="rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
          >
            {executando ? "Disparando…" : "▶ Executar disparo automático agora"}
          </button>
          <button
            type="button"
            disabled={executando || simulando}
            onClick={() => void executar(true)}
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {simulando ? "Simulando…" : "🧪 Simular (sem enviar)"}
          </button>
          <span className="text-[11px] text-slate-500">
            Convite automático ao agendar: <strong>{conviteAutomatico ? "ligado" : "desligado"}</strong>
            {" "}(<code>WHATSAPP_AUTO_CONVITE</code>)
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            URL para o agendador (cron) — rode a cada 5 minutos
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="max-w-full overflow-x-auto rounded-lg bg-slate-950 px-3 py-2 font-mono text-[11px] text-emerald-300">
              {urlDisparo}
            </code>
            <button
              type="button"
              onClick={() => void copiarUrl()}
              className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
            >
              {copiado ? "✓ Copiado" : "Copiar URL"}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
            Compatível com cron-job.org, Google Cloud Scheduler, GitHub Actions, Vercel Cron e
            Supabase (<code>pg_cron</code> + <code>pg_net</code>). Sem agendador externo, use os
            botões acima — o disparo roda no servidor, não no navegador.
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Testar o provedor
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={telefoneTeste}
              onChange={(event) => setTelefoneTeste(event.target.value)}
              placeholder="(11) 98812-4477"
              inputMode="tel"
              className="w-[190px] rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              disabled={testando || !provedorConfigurado}
              onClick={() => void testar()}
              className="rounded-lg bg-slate-900 px-3.5 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {testando ? "Enviando…" : "Enviar mensagem de teste"}
            </button>
          </div>
          {mensagemTeste ? (
            <p className="mt-2 text-[11px] font-medium text-emerald-700">{mensagemTeste}</p>
          ) : null}
          {erroTeste ? (
            <p className="mt-2 text-[11px] font-medium text-rose-700">{erroTeste}</p>
          ) : null}
        </div>

        {resultado ? (
          <div className="rounded-xl ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2.5 text-[11px] font-semibold">
              <span className={resultado.ok ? "text-emerald-700" : "text-rose-700"}>
                {resultado.ok ? "Execução concluída" : resultado.erro ?? "Falha na execução"}
              </span>
              {resultado.simulacao ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                  simulação
                </span>
              ) : null}
              <span className="text-slate-600">
                📩 {resultado.convitesEnviados ?? 0} · ⏰ {resultado.lembretesEnviados ?? 0} · 🔁{" "}
                {resultado.alteracoesEnviadas ?? 0} · ⚠️ {resultado.falhas ?? 0} falha(s) · ⏭️{" "}
                {resultado.ignorados ?? 0} ignorado(s)
              </span>
            </div>
            <ul className="max-h-64 divide-y divide-slate-100 overflow-auto bg-white">
              {(resultado.detalhes ?? []).length === 0 ? (
                <li className="px-3 py-4 text-center text-[11px] text-slate-500">
                  Nada para disparar neste momento (nenhum lembrete vencido ou convite pendente).
                </li>
              ) : (
                (resultado.detalhes ?? []).map((d, indice) => (
                  <li key={`${d.compromissoId}-${indice}`} className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          d.status === "ENVIADO"
                            ? "bg-emerald-50 text-emerald-700"
                            : d.status === "FALHA"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {d.status}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {FINALIDADE_LABEL[d.finalidade] ?? d.finalidade}
                      </span>
                      <span className="truncate text-slate-600">{d.titulo}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {d.destino ?? "sem responsável"} · {d.telefone ?? "sem telefone"}
                      {d.motivo ? ` · ${d.motivo}` : ""}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
