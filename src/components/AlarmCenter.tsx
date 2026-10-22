"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cargoInfo, statusInfo, tipoLabel } from "@/lib/constants";
import { fmtCountdown, fmtHoraRelativa, fmtShort, toLocalDate } from "@/lib/datetime";
import type { AlarmeItem, DespertadorResposta } from "@/lib/types";

const STORAGE_DISPARADOS = "age:despertador:disparados";
const STORAGE_SONECA = "age:despertador:soneca";
const STORAGE_SOM = "age:despertador:som";
const JANELA_APOS_INICIO_MS = 3 * 60 * 60 * 1000;

function chaveDe(item: AlarmeItem) {
  return `${item.id}:${item.dataInicio}:${item.horaInicio}`;
}

function lerJson<T>(chave: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AlarmCenter() {
  const [itens, setItens] = useState<AlarmeItem[]>([]);
  const [agora, setAgora] = useState<number>(() => Date.now());
  const [disparados, setDisparados] = useState<string[]>([]);
  const [soneca, setSoneca] = useState<Record<string, number>>({});
  const [somLigado, setSomLigado] = useState(true);
  const [fila, setFila] = useState<AlarmeItem[]>([]);
  const [painelAberto, setPainelAberto] = useState(false);
  const [permissao, setPermissao] = useState<string>("default");
  const [pronto, setPronto] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  // --------- persistência local ---------
  useEffect(() => {
    setDisparados(lerJson<string[]>(STORAGE_DISPARADOS, []));
    setSoneca(lerJson<Record<string, number>>(STORAGE_SONECA, {}));
    const som = window.localStorage.getItem(STORAGE_SOM);
    setSomLigado(som !== "off");
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissao(window.Notification.permission);
    } else {
      setPermissao("unsupported");
    }
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    window.localStorage.setItem(STORAGE_DISPARADOS, JSON.stringify(disparados.slice(-400)));
  }, [disparados, pronto]);

  useEffect(() => {
    if (!pronto) return;
    window.localStorage.setItem(STORAGE_SONECA, JSON.stringify(soneca));
  }, [soneca, pronto]);

  useEffect(() => {
    if (!pronto) return;
    window.localStorage.setItem(STORAGE_SOM, somLigado ? "on" : "off");
  }, [somLigado, pronto]);

  // --------- relógio ---------
  useEffect(() => {
    const timer = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // --------- carga dos compromissos ---------
  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/compromissos/despertador", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as DespertadorResposta;
      setItens(data.itens ?? []);
    } catch {
      /* silencioso: mantém último estado */
    }
  }, []);

  useEffect(() => {
    void carregar();
    const timer = window.setInterval(() => void carregar(), 30000);
    return () => window.clearInterval(timer);
  }, [carregar]);

  // --------- som ---------
  const tocar = useCallback(() => {
    if (!somLigado) return;
    try {
      type AudioWindow = Window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const w = window as AudioWindow;
      const Ctor = window.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return;
      const ctx = audioRef.current ?? new Ctor();
      audioRef.current = ctx;
      void ctx.resume();
      [0, 0.28, 0.56].forEach((delay, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = index === 2 ? 1180 : 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.24);
      });
    } catch {
      /* navegador pode bloquear áudio sem interação */
    }
  }, [somLigado]);

  // --------- avaliação dos alarmes ---------
  const calcular = useMemo(() => {
    const devidos: AlarmeItem[] = [];
    const antigos: string[] = [];
    for (const item of itens) {
      if (item.status === "CANCELADO" || item.status === "REALIZADO") continue;
      if (!item.despertadorAtivo) continue;
      const chave = chaveDe(item);
      if (disparados.includes(chave)) continue;
      const inicio = toLocalDate(item.dataInicio, item.horaInicio).getTime();
      const alerta = inicio - item.lembreteMinutos * 60000;
      if (agora < alerta) continue;
      if (agora > inicio + JANELA_APOS_INICIO_MS) {
        antigos.push(chave);
        continue;
      }
      const sonecaAte = soneca[chave] ?? 0;
      if (agora < sonecaAte) continue;
      devidos.push(item);
    }
    return { devidos, antigos };
  }, [itens, disparados, soneca, agora]);

  // descarta alarmes muito antigos sem incomodar o usuário
  useEffect(() => {
    if (calcular.antigos.length > 0) {
      setDisparados((prev) => Array.from(new Set([...prev, ...calcular.antigos])));
    }
  }, [calcular.antigos]);

  // enfileira alarmes devidos
  useEffect(() => {
    if (calcular.devidos.length === 0) return;
    setFila((prev) => {
      const chaves = new Set(prev.map(chaveDe));
      const novos = calcular.devidos.filter((i) => !chaves.has(chaveDe(i)));
      return novos.length > 0 ? [...prev, ...novos] : prev;
    });
  }, [calcular.devidos]);

  const alarmeAtivo = fila[0] ?? null;

  useEffect(() => {
    if (!alarmeAtivo) return;
    tocar();
    const timer = window.setInterval(tocar, 3500);
    return () => window.clearInterval(timer);
  }, [alarmeAtivo, tocar]);

  useEffect(() => {
    if (!alarmeAtivo) return;
    const Notificacao =
      typeof window === "undefined" ? null : "Notification" in window ? window.Notification : null;
    if (!Notificacao || Notificacao.permission !== "granted") return;
    try {
      new Notificacao(`⏰ ${alarmeAtivo.titulo}`, {
        body: `${alarmeAtivo.horaInicio} · ${alarmeAtivo.local} · ${tipoLabel(alarmeAtivo.tipo)}`,
        tag: `age-${alarmeAtivo.id}`,
      });
    } catch {
      /* ignora bloqueios */
    }
  }, [alarmeAtivo]);

  const encerrar = useCallback((item: AlarmeItem) => {
    setDisparados((prev) => Array.from(new Set([...prev, chaveDe(item)])));
    setFila((prev) => prev.filter((i) => chaveDe(i) !== chaveDe(item)));
  }, []);

  const adiar = useCallback((item: AlarmeItem, minutos: number) => {
    setSoneca((prev) => ({ ...prev, [chaveDe(item)]: Date.now() + minutos * 60000 }));
    setFila((prev) => prev.filter((i) => chaveDe(i) !== chaveDe(item)));
  }, []);

  const atualizarStatus = useCallback(
    async (item: AlarmeItem, status: string) => {
      try {
        await fetch(`/api/compromissos/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        setItens((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status } : i)),
        );
        setMensagem(`Situação de "${item.titulo}" atualizada para ${statusInfo(status).label}.`);
        window.setTimeout(() => setMensagem(null), 4000);
      } catch {
        /* ignora */
      }
      encerrar(item);
    },
    [encerrar],
  );

  const [avisandoId, setAvisandoId] = useState<number | null>(null);

  const avisarWhatsApp = useCallback(async (item: AlarmeItem) => {
    setAvisandoId(item.id);
    try {
      const res = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compromissoId: item.id,
          finalidade: "LEMBRETE",
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        link?: string | null;
        error?: string;
        status?: string;
      };
      if (!res.ok || !data.ok) {
        setMensagem(data.error ?? "Não foi possível preparar a mensagem de WhatsApp.");
        globalThis.setTimeout(() => setMensagem(null), 6000);
        return;
      }
      if (data.link) {
        window.open(data.link, "_blank", "noopener,noreferrer");
        setMensagem("WhatsApp aberto com o lembrete do compromisso — confirme o envio.");
      } else {
        setMensagem("Lembrete gerado. Copie o texto em Detalhes do compromisso.");
      }
      globalThis.setTimeout(() => setMensagem(null), 6000);
    } catch {
      setMensagem("Falha de comunicação ao preparar o lembrete de WhatsApp.");
      globalThis.setTimeout(() => setMensagem(null), 6000);
    } finally {
      setAvisandoId(null);
    }
  }, []);

  const pedirPermissao = useCallback(async () => {
    const Notificacao =
      typeof window === "undefined" ? null : "Notification" in window ? window.Notification : null;
    if (!Notificacao) {
      setMensagem("Este navegador não suporta notificações. O despertador na tela seguirá ativo.");
      globalThis.setTimeout(() => setMensagem(null), 4500);
      return;
    }
    const resultado = await Notificacao.requestPermission();
    setPermissao(resultado);
    setMensagem(
      resultado === "granted"
        ? "Notificações ativadas com sucesso."
        : "Permissão não concedida — o despertador na tela continua funcionando.",
    );
    globalThis.setTimeout(() => setMensagem(null), 4500);
  }, []);

  const criarTeste = useCallback(async () => {
    const pad = (n: number) => `${n}`.padStart(2, "0");
    const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const hora = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const inicio = new Date(Date.now() + 2 * 60000);
    const fim = new Date(Date.now() + 32 * 60000);

    try {
      await fetch("/api/compromissos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: "[TESTE] Despertador de compromissos — excluir após validar",
          tipo: "ORIENTACAO_PEDAGOGICA",
          assunto: "Compromisso criado automaticamente para validar o despertador de compromissos",
          descricao:
            "Registro gerado pelo painel do despertador para demonstrar o aviso sonoro, a notificação do navegador e o alerta na tela.",
          cargoResponsavel: "COORDENADOR_PEDAGOGICO",
          dataInicio: iso(inicio),
          dataFim: iso(fim),
          horaInicio: hora(inicio),
          horaFim: hora(fim),
          local: "Sala de Coordenação Pedagógica",
          participantes: "Equipe de gestão (validação do despertador)",
          prioridade: "ALTA",
          status: "AGENDADO",
          lembreteMinutos: 5,
          despertadorAtivo: true,
        }),
      });
      setMensagem(
        "Compromisso [TESTE] criado — o despertador dispara em instantes. Exclua o registro após validar.",
      );
      globalThis.setTimeout(() => setMensagem(null), 5000);
      await carregar();
    } catch {
      setMensagem("Não foi possível criar o compromisso de teste.");
      globalThis.setTimeout(() => setMensagem(null), 4000);
    }
  }, [carregar]);

  const proximos = useMemo(() => {
    return itens
      .filter((i) => i.status !== "CANCELADO" && i.status !== "REALIZADO")
      .map((item) => {
        const inicio = toLocalDate(item.dataInicio, item.horaInicio);
        return { item, inicio };
      })
      .filter(({ inicio }) => inicio.getTime() + JANELA_APOS_INICIO_MS > agora)
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
      .slice(0, 6);
  }, [itens, agora]);

  const destaque = proximos[0] ?? null;
  const restante = destaque ? destaque.inicio.getTime() - agora : 0;
  const infoDestaque = destaque ? cargoInfo(destaque.item.cargoResponsavel) : null;

  return (
    <>
      {mensagem ? (
        <div className="fixed bottom-24 right-4 z-[70] max-w-xs animate-fade-up rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-xl sm:right-6">
          {mensagem}
        </div>
      ) : null}

      {/* Painel flutuante do despertador */}
      <div className="no-print fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
        {painelAberto ? (
          <div className="w-[330px] animate-overlay-in overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-slate-900 to-indigo-900 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <span className="text-base">⏰</span>
                <div>
                  <p className="text-xs font-semibold">Despertador de compromissos</p>
                  <p className="text-[10px] text-slate-300">
                    {somLigado ? "Som ativo" : "Som silenciado"} · verificação a cada 30s
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPainelAberto(false)}
                className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 px-3 py-3">
              {proximos.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                  Nenhum compromisso pendente em 7 dias.
                </p>
              ) : (
                proximos.map(({ item, inicio }) => {
                  const info = cargoInfo(item.cargoResponsavel);
                  const emMs = inicio.getTime() - agora;
                  return (
                    <Link
                      key={`${item.id}-${item.horaInicio}`}
                      href={`/compromissos/${item.id}`}
                      onClick={() => setPainelAberto(false)}
                      className="block rounded-xl border border-slate-200 px-3 py-2 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-xs font-semibold text-slate-800">
                          {item.titulo}
                        </p>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${info.dot}`} />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {fmtShort(item.dataInicio)} · {item.horaInicio} → {item.horaFim}
                      </p>
                      <p className="text-[11px] font-medium text-indigo-600">
                        {emMs > 0
                          ? `começa ${fmtHoraRelativa(inicio, new Date(agora))}`
                          : "em andamento agora"}
                      </p>
                    </Link>
                  );
                })
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setSomLigado((v) => !v)}
                className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              >
                {somLigado ? "🔊 Som" : "🔇 Silenciado"}
              </button>
              <button
                type="button"
                onClick={() => void pedirPermissao()}
                className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              >
                {permissao === "granted" ? "🔔 Notificações on" : "🔔 Ativar notificações"}
              </button>
              <button
                type="button"
                onClick={() => tocar()}
                className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              >
                🔔 Testar som
              </button>
              <button
                type="button"
                onClick={() => void criarTeste()}
                title="Cria um compromisso [TESTE] com alarme em 2 minutos — exclua depois de validar"
                className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700"
              >
                ⏰ Alarme de teste
              </button>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setPainelAberto((v) => !v)}
          className={`group flex items-center gap-2.5 rounded-full bg-slate-900 px-4 py-3 text-left text-white shadow-xl transition hover:bg-slate-800 ${
            alarmeAtivo ? "animate-alarm-pulse" : ""
          }`}
        >
          <span className={`text-lg ${alarmeAtivo ? "animate-alarm-ring" : ""}`}>
            {alarmeAtivo ? "🔔" : "⏰"}
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Próximo compromisso
            </span>
            <span className="block max-w-[168px] truncate text-xs font-semibold">
              {destaque ? destaque.item.titulo : "Agenda livre"}
            </span>
          </span>
          {destaque ? (
            <span className="ml-1 rounded-full bg-white/10 px-2 py-1 font-mono text-[11px] font-semibold text-emerald-300">
              {restante > 0 ? fmtCountdown(restante) : "agora"}
            </span>
          ) : null}
        </button>
      </div>

      {/* Modal do despertador disparado */}
      {alarmeAtivo ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-overlay-in overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center gap-3 bg-gradient-to-r from-rose-600 to-orange-500 px-5 py-4 text-white">
              <span className="animate-alarm-ring text-2xl">⏰</span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/80">
                  Despertador de compromisso
                </p>
                <p className="text-sm font-semibold">
                  {(() => {
                    const inicio = toLocalDate(alarmeAtivo.dataInicio, alarmeAtivo.horaInicio);
                    const diff = inicio.getTime() - agora;
                    if (Math.abs(diff) < 60000) return "Começa agora!";
                    return diff > 0
                      ? `Começa em ${fmtCountdown(diff)}`
                      : `Iniciado ${fmtHoraRelativa(inicio, new Date(agora))}`;
                  })()}
                </p>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                  {alarmeAtivo.titulo}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{alarmeAtivo.assunto}</p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Horário
                  </dt>
                  <dd className="font-semibold text-slate-800">
                    {alarmeAtivo.horaInicio} → {alarmeAtivo.horaFim}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Local
                  </dt>
                  <dd className="truncate font-semibold text-slate-800">{alarmeAtivo.local}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Cargo
                  </dt>
                  <dd className="truncate font-semibold text-slate-800">
                    {infoDestaque?.short ?? cargoInfo(alarmeAtivo.cargoResponsavel).short}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Participantes
                  </dt>
                  <dd className="truncate font-semibold text-slate-800">
                    {alarmeAtivo.gestorNome ?? compromissoParticipantes(alarmeAtivo)}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void avisarWhatsApp(alarmeAtivo)}
                  disabled={avisandoId === alarmeAtivo.id}
                  className="w-full rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
                >
                  {avisandoId === alarmeAtivo.id
                    ? "Abrindo WhatsApp…"
                    : "💬 Avisar o responsável pelo WhatsApp"}
                </button>
                <button
                  type="button"
                  onClick={() => void atualizarStatus(alarmeAtivo, "EM_ANDAMENTO")}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  ✅ Confirmar início
                </button>
                <button
                  type="button"
                  onClick={() => void adiar(alarmeAtivo, 5)}
                  className="rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-200"
                >
                  😴 Soneca 5 min
                </button>
                <button
                  type="button"
                  onClick={() => encerrar(alarmeAtivo)}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Dispensar
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <Link
                  href={`/compromissos/${alarmeAtivo.id}`}
                  onClick={() => encerrar(alarmeAtivo)}
                  className="font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Abrir detalhes do compromisso →
                </Link>
                {fila.length > 1 ? <span>+{fila.length - 1} alarme(s) na fila</span> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function compromissoParticipantes(item: AlarmeItem) {
  return item.gestorNome ?? `${cargoInfo(item.cargoResponsavel).short}`;
}
