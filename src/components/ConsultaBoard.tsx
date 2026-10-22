"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CARGOS, STATUSES, TIPOS, cargoInfo, statusInfo } from "@/lib/constants";
import { fmtShort } from "@/lib/datetime";
import { inputClass, selectClass } from "./ui";

type AgendaItem = {
  id: number;
  titulo: string;
  tipo: string;
  tipoDescricao: string;
  assunto: string;
  cargo: string;
  cargoDescricao: string;
  local: string;
  dataInicio: string;
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  prioridade: string;
  status: string;
  atualizadoEm: string;
  participantes?: string | null;
  descricao?: string | null;
  responsavel?: string | null;
};

type Resposta = {
  ok: boolean;
  modo: string;
  geradoEm: string;
  total: number;
  itens: AgendaItem[];
  error?: string;
};

const filtrosVazios = {
  de: "",
  ate: "",
  periodo: "PROXIMOS7",
  cargo: "",
  tipo: "",
  local: "",
  status: "",
  busca: "",
  key: "",
  formato: "json",
};

export function ConsultaBoard() {
  const [filtros, setFiltros] = useState({ ...filtrosVazios });
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarJson, setMostrarJson] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const consulta = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([chave, valor]) => {
      if (valor) params.set(chave, valor);
    });
    return params.toString();
  }, [filtros]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/public/v1/agenda?${consulta}`, { cache: "no-store" });
      const data = (await res.json()) as Resposta;
      if (!res.ok || !data.ok) {
        setErro(data.error ?? "Não foi possível consultar a agenda pública.");
        setDados(null);
      } else {
        setDados(data);
      }
    } catch {
      setErro("Falha de comunicação com a API pública.");
    } finally {
      setCarregando(false);
    }
  }, [consulta]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(`/api/public/v1/agenda?${consulta}`);
      setCopiado(true);
      globalThis.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErro("Não foi possível copiar o endereço automaticamente.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="card-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Período
            </span>
            <select
              className={selectClass}
              value={filtros.periodo}
              onChange={(event) => setFiltros({ ...filtros, periodo: event.target.value, de: "", ate: "" })}
            >
              <option value="HOJE">Hoje</option>
              <option value="SEMANA">Esta semana</option>
              <option value="PROXIMOS7">Próximos 7 dias</option>
              <option value="MES">Este mês</option>
              <option value="TODOS">Todo o período</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              De (opcional)
            </span>
            <input
              type="date"
              className={inputClass}
              value={filtros.de}
              onChange={(event) => setFiltros({ ...filtros, de: event.target.value, periodo: "" })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Até (opcional)
            </span>
            <input
              type="date"
              className={inputClass}
              value={filtros.ate}
              onChange={(event) => setFiltros({ ...filtros, ate: event.target.value, periodo: "" })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Cargo
            </span>
            <select
              className={selectClass}
              value={filtros.cargo}
              onChange={(event) => setFiltros({ ...filtros, cargo: event.target.value })}
            >
              <option value="">Todos os cargos</option>
              {CARGOS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Tipo
            </span>
            <select
              className={selectClass}
              value={filtros.tipo}
              onChange={(event) => setFiltros({ ...filtros, tipo: event.target.value })}
            >
              <option value="">Todos os tipos</option>
              {TIPOS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Situação
            </span>
            <select
              className={selectClass}
              value={filtros.status}
              onChange={(event) => setFiltros({ ...filtros, status: event.target.value })}
            >
              <option value="">Todas</option>
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Local
            </span>
            <input
              className={inputClass}
              value={filtros.local}
              onChange={(event) => setFiltros({ ...filtros, local: event.target.value })}
              placeholder="Sala de Reuniões"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Chave de integração (opcional)
            </span>
            <input
              className={inputClass}
              value={filtros.key}
              onChange={(event) => setFiltros({ ...filtros, key: event.target.value })}
              placeholder="age_..."
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className={`${inputClass} max-w-md`}
            value={filtros.busca}
            onChange={(event) => setFiltros({ ...filtros, busca: event.target.value })}
            placeholder="Busca livre: assunto, título, local..."
          />
          <button
            type="button"
            onClick={() => void carregar()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            {carregando ? "Consultando…" : "Consultar agora"}
          </button>
          <button
            type="button"
            onClick={() => setFiltros({ ...filtrosVazios })}
            className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Limpar
          </button>
          <span className="text-[11px] text-slate-500">
            Endpoint consultado em tempo real: <strong>/api/public/v1/agenda</strong>
          </span>
          <button
            type="button"
            onClick={() => void copiar()}
            className="rounded-lg bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100"
          >
            {copiado ? "Copiado!" : "Copiar URL da consulta"}
          </button>
        </div>
      </div>

      {erro ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {erro}
        </p>
      ) : null}

      <div className="card-surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {dados ? `${dados.total} compromisso(s) publicados` : "Consultando agenda…"}
            </h2>
            <p className="text-[11px] text-slate-500">
              {dados
                ? `Modo ${dados.modo} · atualizado em ${new Date(dados.geradoEm).toLocaleString("pt-BR")}`
                : "Aguarde o retorno da API pública."}
            </p>
          </div>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={mostrarJson}
              onChange={(event) => setMostrarJson(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            Ver resposta JSON
          </label>
        </div>

        {mostrarJson && dados ? (
          <pre className="max-h-72 overflow-auto bg-slate-950 px-4 py-3 text-[11px] leading-relaxed text-emerald-300">
            {JSON.stringify(dados, null, 2)}
          </pre>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Data / hora</th>
                <th className="px-3 py-2.5 font-semibold">Compromisso</th>
                <th className="px-3 py-2.5 font-semibold">Cargo</th>
                <th className="px-3 py-2.5 font-semibold">Local</th>
                <th className="px-3 py-2.5 font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!dados || dados.itens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Nenhum compromisso publicado para os filtros informados.
                  </td>
                </tr>
              ) : (
                dados.itens.map((item) => {
                  const info = cargoInfo(item.cargo);
                  const status = statusInfo(item.status);
                  return (
                    <tr key={item.id} className="bg-white align-top hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-3 py-3">
                        <p className="font-semibold text-slate-800">{fmtShort(item.dataInicio)}</p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {item.horaInicio} → {item.horaFim}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-800">{item.titulo}</p>
                        <p className="text-[11px] text-slate-500">{item.assunto}</p>
                        <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.tipoDescricao}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${info.chip}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${info.dot}`} />
                          {info.sigla}
                        </span>
                        <p className="mt-1 max-w-[170px] text-[11px] text-slate-500">
                          {item.cargoDescricao}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{item.local}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${status.chip}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
