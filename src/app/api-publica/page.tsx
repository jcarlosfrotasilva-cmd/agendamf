import Link from "next/link";
import { headers } from "next/headers";
import { TokenManager } from "@/components/TokenManager";
import { Card } from "@/components/ui";
import { ESCOLA } from "@/lib/escola";
import { listarTokens } from "@/lib/repo";

export const dynamic = "force-dynamic";

async function urlBase() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function ApiPublicaPage() {
  const [base, tokens] = await Promise.all([urlBase(), listarTokens()]);

  const endpoints = [
    {
      metodo: "GET",
      rota: "/api/public/v1/agenda",
      descricao:
        "Lista completa dos compromissos publicados, em JSON. Aceita filtros por período, cargo, tipo, local, situação e busca livre.",
      exemplo: `${base}/api/public/v1/agenda?periodo=PROXIMOS7&cargo=COORDENADOR_PEDAGOGICO`,
    },
    {
      metodo: "GET",
      rota: "/api/public/v1/agenda?formato=ics",
      descricao:
        "Mesma consulta, porém no formato iCalendar, permitindo importar um recorte específico da agenda.",
      exemplo: `${base}/api/public/v1/agenda?de=2026-01-01&ate=2026-01-31&formato=ics`,
    },
    {
      metodo: "GET",
      rota: "/api/public/v1/agenda.ics",
      descricao:
        "Feed iCalendar para assinatura contínua no Google Agenda, Outlook ou Apple Calendar, com alarme (VALARM) por compromisso.",
      exemplo: `${base}/api/public/v1/agenda.ics`,
    },
    {
      metodo: "GET",
      rota: "/api/public/v1/resumo",
      descricao:
        "Indicadores agregados por cargo, tipo, situação e locais mais utilizados, com o próximo compromisso da gestão.",
      exemplo: `${base}/api/public/v1/resumo`,
    },
    {
      metodo: "GET",
      rota: "/api/public/v1/openapi",
      descricao: "Contrato OpenAPI 3.0 para geração automática de clientes e documentação.",
      exemplo: `${base}/api/public/v1/openapi`,
    },
    {
      metodo: "POST",
      rota: "/api/compromissos",
      descricao:
        "Endpoint interno de escrita (usado pelo formulário do sistema) para agendar, atualizar e excluir compromissos.",
      exemplo: `curl -X POST ${base}/api/compromissos -H "Content-Type: application/json" -d '{"titulo":"Orientação Pedagógica","assunto":"Pauta","cargoResponsavel":"DIRETOR","dataInicio":"2026-03-10","dataFim":"2026-03-10","horaInicio":"08:00","horaFim":"10:00","local":"Sala de Reuniões","tipo":"ORIENTACAO_PEDAGOGICA"}'`,
    },
  ];

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Integração externa · {ESCOLA.nome}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          API pública da Agenda da Gestão Escolar
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Consulta externa online, somente leitura, sobre o banco de dados interno (PostgreSQL no
          Supabase). Ideal para portais institucionais, murais digitais, painéis de BI e integrações
          com sistemas da secretaria de educação.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {endpoints.map((endpoint) => (
            <Card key={endpoint.rota} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold text-white ${
                    endpoint.metodo === "GET" ? "bg-emerald-600" : "bg-indigo-600"
                  }`}
                >
                  {endpoint.metodo}
                </span>
                <code className="font-mono text-xs font-semibold text-slate-800">
                  {endpoint.rota}
                </code>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{endpoint.descricao}</p>
              <code className="mt-2.5 block overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 px-3 py-2 font-mono text-[11px] leading-relaxed text-emerald-300">
                {endpoint.exemplo}
              </code>
              <a
                href={endpoint.rota.startsWith("/api/public") ? `/api/public/v1/${endpoint.rota.replace("/api/public/v1/", "").split("?")[0]}` : endpoint.rota}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Abrir endpoint no navegador →
              </a>
            </Card>
          ))}

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Parâmetros aceitos</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Parâmetro</th>
                    <th className="px-3 py-2 font-semibold">Valores</th>
                    <th className="px-3 py-2 font-semibold">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ["de / ate", "AAAA-MM-DD", "Intervalo de datas (qualquer um dos limites é opcional)."],
                    ["periodo", "HOJE · SEMANA · PROXIMOS7 · MES · PASSADOS · TODOS", "Atalho de período aplicado sobre a data de início."],
                    ["cargo", "DIRETOR · VICE_DIRETOR · COORDENADOR_PEDAGOGICO · GERENTE_ORGANIZACAO", "Filtra por cargo da gestão."],
                    [
                      "tipo",
                      "ORIENTACAO_PEDAGOGICA · REUNIAO · REUNIAO_APM · REUNIAO_CONSELHO_ESCOLA · REUNIAO_GREMIO_ESTUDANTIL · FORMACAO · ...",
                      "Filtra por tipo de compromisso, incluindo as reuniões colegiadas (APM, Conselho de Escola e Grêmio Estudantil).",
                    ],
                    ["local", "texto", "Filtra por local exato (ex.: Auditório)."],
                    ["status", "AGENDADO · CONFIRMADO · REALIZADO · ADIADO · CANCELADO", "Filtra pela situação registrada."],
                    ["busca", "texto", "Busca livre em título, assunto, descrição, local e participantes."],
                    ["formato", "json · ics", "Formato da resposta (padrão: json)."],
                    ["key", "chave API", "Libera campos detalhados (pauta, participantes e responsável)."],
                  ].map((linha) => (
                    <tr key={linha[0]} className="bg-white">
                      <td className="px-3 py-2 font-mono text-[11px] font-semibold text-slate-800">
                        {linha[0]}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{linha[1]}</td>
                      <td className="px-3 py-2 text-slate-600">{linha[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Chaves de integração</h2>
            <p className="mt-1 text-xs text-slate-600">
              Gere chaves para órgãos e sistemas parceiros. Sem chave, a API responde em modo
              público (sem pauta detalhada); com chave válida, o retorno inclui todos os campos.
              Envie a chave via <code>?key=</code>, <code>X-Api-Key</code> ou{" "}
              <code>Authorization: Bearer</code>.
            </p>
            <div className="mt-4">
              <TokenManager
                tokens={tokens.map((t) => ({
                  id: t.id,
                  nome: t.nome,
                  orgao: t.orgao,
                  ativo: t.ativo,
                  criadoEm: t.criadoEm.toISOString(),
                  tokenMascarado: `${t.token.slice(0, 8)}••••••••${t.token.slice(-4)}`,
                }))}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Fontes de dados</h2>
            <ul className="mt-2 space-y-2 text-xs text-slate-600">
              <li>
                <strong className="font-semibold text-slate-800">Banco interno:</strong> PostgreSQL
                (Drizzle ORM) com as tabelas gestores, compromissos, auditoria e api_tokens — acesso
                completo de leitura e escrita pelo sistema.
              </li>
              <li>
                <strong className="font-semibold text-slate-800">Banco externo de consulta:</strong>{" "}
                camada de API somente-leitura com CORS, cache desativado e filtros prontos para
                consumo por qualquer plataforma.
              </li>
              <li>
                <strong className="font-semibold text-slate-800">Exportação:</strong> arquivos .ics
                individuais por compromisso e feed contínuo para assinatura.
              </li>
            </ul>
            <Link
              href="/consulta"
              className="mt-3 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Abrir consulta online →
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Despertador e notificações</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              No sistema, cada compromisso possui antecedência configurável (5 min a 24 h). O
              Despertador verifica a agenda a cada 30 segundos, emite aviso sonoro, notificação do
              navegador e alerta na tela com opções de soneca, confirmação de início ou dispensa.
              No feed iCalendar, o mesmo alarme é replicado como <code>VALARM</code> para os
              aplicativos de agenda.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
