"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

type Resultado = {
  rota: string;
  descricao: string;
  status: number | null;
  ms: number;
  tipo: string;
  bytes: number;
  preview: string;
  ok: boolean;
};

const ROTAS: { rota: string; descricao: string }[] = [
  { rota: "/api/health", descricao: "Saúde do sistema e conexão PostgreSQL" },
  { rota: "/api/compromissos", descricao: "Lista interna de compromissos" },
  { rota: "/api/compromissos/despertador", descricao: "Fila do despertador de compromissos" },
  { rota: "/api/gestores", descricao: "Equipe de gestão por cargo" },
  { rota: "/api/whatsapp", descricao: "Histórico de mensagens e canal do WhatsApp" },
  { rota: "/api/professores", descricao: "Corpo docente cadastrado" },
  { rota: "/professores", descricao: "Página Professores e agenda docente" },
  { rota: "/api/public/v1/agenda?periodo=PROXIMOS7", descricao: "Consulta externa (JSON, próximos 7 dias)" },
  { rota: "/api/public/v1/resumo", descricao: "Indicadores agregados públicos" },
  { rota: "/api/public/v1/openapi", descricao: "Contrato OpenAPI 3.0" },
  { rota: "/api/public/v1/agenda.ics", descricao: "Feed iCalendar da agenda completa" },
  { rota: "/agenda?periodo=TODOS&agrupamento=CARGO", descricao: "Página Agenda agrupada por cargo" },
  { rota: "/mensagens", descricao: "Página de mensagens por WhatsApp" },
  { rota: "/consulta", descricao: "Página de consulta online" },
  { rota: "/gestores", descricao: "Página de gestores" },
  { rota: "/locais", descricao: "Página de locais e ocupação" },
];

export function SandboxRunner() {
  const router = useRouter();
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [executando, setExecutando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [gerandoAlarme, setGerandoAlarme] = useState(false);
  const [recarregando, setRecarregando] = useState(false);

  const rodar = useCallback(async () => {
    setExecutando(true);
    setResultados([]);
    const acumulado: Resultado[] = [];

    for (const item of ROTAS) {
      const inicio = performance.now();
      try {
        const res = await fetch(item.rota, { cache: "no-store" });
        const texto = await res.text();
        acumulado.push({
          rota: item.rota,
          descricao: item.descricao,
          status: res.status,
          ms: Math.round(performance.now() - inicio),
          tipo: res.headers.get("content-type") ?? "—",
          bytes: new Blob([texto]).size,
          preview: texto.slice(0, 180).replace(/\s+/g, " "),
          ok: res.ok,
        });
      } catch {
        acumulado.push({
          rota: item.rota,
          descricao: item.descricao,
          status: null,
          ms: Math.round(performance.now() - inicio),
          tipo: "—",
          bytes: 0,
          preview: "Falha de comunicação com o servidor.",
          ok: false,
        });
      }
      setResultados([...acumulado]);
    }
    setExecutando(false);
    const falhas = acumulado.filter((r) => !r.ok).length;
    setMensagem(
      falhas === 0
        ? `Smoke test concluído: ${acumulado.length} rotas verificadas, nenhuma falha.`
        : `Smoke test concluído com ${falhas} falha(s) em ${acumulado.length} rotas.`,
    );
  }, []);

  const criarAlarme = useCallback(async () => {
    setGerandoAlarme(true);
    const pad = (n: number) => `${n}`.padStart(2, "0");
    const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const hora = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const inicio = new Date(Date.now() + 2 * 60000);
    const fim = new Date(Date.now() + 32 * 60000);
    const res = await fetch("/api/compromissos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: "[SANDBOX] Validação do despertador de compromissos",
        tipo: "REUNIAO_GREMIO_ESTUDANTIL",
        assunto: "Compromisso criado pelo sandbox para validar o despertador",
        descricao:
          "Registro de teste gerado pela página de Sandbox: valida som, notificação do navegador, alerta na tela, soneca e baixa de situação.",
        cargoResponsavel: "COORDENADOR_PEDAGOGICO",
        dataInicio: iso(inicio),
        dataFim: iso(fim),
        horaInicio: hora(inicio),
        horaFim: hora(fim),
        local: "Auditório",
        participantes: "Equipe de teste do sandbox",
        prioridade: "ALTA",
        status: "AGENDADO",
        lembreteMinutos: 5,
        despertadorAtivo: true,
      }),
    });
    setGerandoAlarme(false);
    const data = (await res.json()) as { ok: boolean; compromisso?: { id: number }; error?: string };
    if (!res.ok || !data.ok) {
      setMensagem(data.error ?? "Não foi possível criar o compromisso de teste.");
      return;
    }
    setMensagem(
      `Compromisso de teste #${data.compromisso?.id} criado — o despertador dispara em ~2 minutos.`,
    );
    router.refresh();
  }, [router]);

  const atualizarEstado = useCallback(() => {
    setRecarregando(true);
    router.refresh();
    globalThis.setTimeout(() => {
      setRecarregando(false);
      setMensagem("Estado da base recarregado a partir do banco de dados.");
    }, 600);
  }, [router]);

  const falhas = resultados.filter((r) => !r.ok).length;

  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Validação técnica do ambiente</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Execute o smoke test de todas as rotas e valide o despertador gerando um compromisso
              real. A base de produção não contém dados de demonstração.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void rodar()}
              disabled={executando}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {executando ? "Testando rotas…" : "▶ Rodar smoke test"}
            </button>
            <button
              type="button"
              onClick={() => void criarAlarme()}
              disabled={gerandoAlarme}
              className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
            >
              {gerandoAlarme ? "Criando…" : "⏰ Criar alarme em 2 min"}
            </button>
            <button
              type="button"
              onClick={() => atualizarEstado()}
              disabled={recarregando}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {recarregando ? "Atualizando…" : "↻ Atualizar estado da base"}
            </button>
          </div>
        </div>

        {mensagem ? (
          <p className="mt-3 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white">
            {mensagem}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Rotas verificadas
            </p>
            <p className="text-lg font-semibold text-slate-900">{resultados.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Sucesso
            </p>
            <p className="text-lg font-semibold text-emerald-600">
              {resultados.length - falhas}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Falhas
            </p>
            <p className={`text-lg font-semibold ${falhas > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {falhas}
            </p>
          </div>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Resultado detalhado</h2>
          <p className="text-[11px] text-slate-500">
            Clique em “Rodar smoke test” para verificar HTTP status, tempo de resposta e o corpo
            retornado por cada rota.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Rota</th>
                <th className="px-3 py-2.5 font-semibold">Tempo</th>
                <th className="px-3 py-2.5 font-semibold">Tipo / tamanho</th>
                <th className="px-3 py-2.5 font-semibold">Prévia da resposta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {resultados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Nenhum teste executado ainda.
                  </td>
                </tr>
              ) : (
                resultados.map((r) => (
                  <tr key={r.rota} className="align-top hover:bg-slate-50/70">
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-lg px-2 py-1 font-mono text-[11px] font-bold text-white ${
                          r.ok ? "bg-emerald-600" : "bg-rose-600"
                        }`}
                      >
                        {r.status ?? "ERR"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-mono text-[11px] font-semibold text-slate-800">{r.rota}</p>
                      <p className="text-[11px] text-slate-500">{r.descricao}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-slate-700">
                      {r.ms} ms
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500">
                      <p>{r.tipo.split(";")[0]}</p>
                      <p>{(r.bytes / 1024).toFixed(1)} KB</p>
                    </td>
                    <td className="max-w-[380px] px-3 py-2.5">
                      <code className="block truncate font-mono text-[10px] text-slate-600">
                        {r.preview}
                      </code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
