import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { mensagensWhatsapp } from "@/db/schema";
import { DisparoAutomaticoPanel } from "@/components/DisparoAutomaticoPanel";
import { Card, EmptyState, StatCard } from "@/components/ui";
import { ESCOLA } from "@/lib/escola";
import { cargoInfo } from "@/lib/constants";
import { toLocalDate } from "@/lib/datetime";
import {
  cloudApiConfigurada,
  descricaoProvedorAtivo,
  envioAutomaticoConvite,
  finalidadeInfo,
  telefoneFormatado,
} from "@/lib/whatsapp";
import { listarLembretesPendentes, resumoMensagens } from "@/lib/repo";
import { desc, eq } from "drizzle-orm";
import { compromissos } from "@/db/schema";
import { headers } from "next/headers";

async function urlBase() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, string> = {
  ENVIADO: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  GERADO: "bg-amber-50 text-amber-700 ring-amber-200",
  FALHA: "bg-rose-50 text-rose-700 ring-rose-200",
  CANCELADO: "bg-slate-100 text-slate-600 ring-slate-300",
};

const STATUS_LABEL: Record<string, string> = {
  ENVIADO: "Enviada",
  GERADO: "Aguardando envio",
  FALHA: "Falha",
  CANCELADO: "Cancelada",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function um(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function MensagensPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const status = um(sp.status) ?? "";
  const finalidade = um(sp.finalidade) ?? "";

  const [resumo, comTitulo, pendentesLista, base] = await Promise.all([
    resumoMensagens(),
    db
      .select({
        mensagem: mensagensWhatsapp,
        titulo: compromissos.titulo,
        dataInicio: compromissos.dataInicio,
      })
      .from(mensagensWhatsapp)
      .leftJoin(compromissos, eq(mensagensWhatsapp.compromissoId, compromissos.id))
      .orderBy(desc(mensagensWhatsapp.criadoEm))
      .limit(120),
    listarLembretesPendentes(20),
    urlBase(),
  ]);

  const filtradas = comTitulo.filter(
    (l) =>
      (!status || l.mensagem.status === status) &&
      (!finalidade || l.mensagem.finalidade === finalidade),
  );

  const porFinalidade = await db
    .select({
      finalidade: mensagensWhatsapp.finalidade,
      total: sql<number>`count(*)::int`,
    })
    .from(mensagensWhatsapp)
    .groupBy(mensagensWhatsapp.finalidade)
    .orderBy(desc(sql`count(*)`));

  const apiAutomatica = cloudApiConfigurada();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#128C7E]">
            Comunicação · {ESCOLA.nome}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Mensagens por WhatsApp
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Registro de todas as comunicações enviadas aos responsáveis pelos compromissos da gestão:
            convites, lembretes do despertador, pedidos de confirmação, alterações e cancelamentos.
            Cada mensagem fica salva com destinatário, finalidade, canal e horário.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/agenda?periodo=PROXIMOS7"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            Avisar sobre próximos compromissos
          </Link>
          <Link
            href="/configuracao"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            Configurar envio automático
          </Link>
        </div>
      </header>

      <DisparoAutomaticoPanel
        provedorConfigurado={apiAutomatica}
        provedorDescricao={descricaoProvedorAtivo()}
        conviteAutomatico={envioAutomaticoConvite()}
        cronSecretDefinido={Boolean(process.env.CRON_SECRET)}
        urlDisparo={`${base}/api/whatsapp/automatico?somente=todos${
          process.env.CRON_SECRET ? "&secret=SEU_CRON_SECRET" : ""
        }`}
        pendentes={pendentesLista.length}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Mensagens registradas" value={resumo.total} icon="💬" />
        <StatCard label="Enviadas" value={resumo.enviadas} accent="emerald" icon="✅" />
        <StatCard
          label="Aguardando confirmação"
          value={resumo.geradas}
          accent="amber"
          hint="Abertas no WhatsApp, sem baixa de envio"
          icon="🕓"
        />
        <StatCard
          label="Enviadas automaticamente"
          value={resumo.automaticas}
          accent="brand"
          hint={apiAutomatica ? "WhatsApp Cloud API ativa" : "Cloud API não configurada"}
          icon="⚡"
        />
      </div>

      {resumo.total === 0 ? (
        <Card className="p-6">
          <EmptyState
            title="Nenhuma mensagem enviada ainda"
            description="Abra um compromisso, entre em “Enviar mensagem pelo WhatsApp” e escolha o texto pronto (convite, lembrete, alteração ou cancelamento). O registro aparece aqui automaticamente."
            action={
              <Link
                href="/agenda?periodo=PROXIMOS7"
                className="mt-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
              >
                Ver compromissos da semana
              </Link>
            }
          />
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Fila de lembretes do despertador ({pendentesLista.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Compromissos com despertador ativo que ainda não receberam lembrete. O disparo ocorre
              automaticamente na antecedência configurada, a cada execução do agendador.
            </p>
          </div>
          <Link
            href="/agenda?periodo=PROXIMOS7"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Abrir agenda →
          </Link>
        </div>
        {pendentesLista.length === 0 ? (
          <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] text-slate-500">
            Nenhum lembrete na fila. Cadastre compromissos com responsável e telefone para que os
            avisos automáticos entrem na fila.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Compromisso</th>
                  <th className="px-3 py-2 font-semibold">Quando</th>
                  <th className="px-3 py-2 font-semibold">Responsável</th>
                  <th className="px-3 py-2 font-semibold">Disparo previsto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendentesLista.map((l) => {
                  const alerta = new Date(
                    toLocalDate(l.dataInicio, l.horaInicio).getTime() - l.lembreteMinutos * 60000,
                  );
                  return (
                    <tr key={l.id} className="bg-white">
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/compromissos/${l.id}#whatsapp`}
                          className="font-semibold text-slate-700 hover:text-indigo-700"
                        >
                          {l.titulo}
                        </Link>
                        <p className="text-[11px] text-slate-500">{l.local}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                        {l.dataInicio} · {l.horaInicio}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-700">
                          {l.gestorNome ?? cargoInfo(l.cargoResponsavel).short}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {l.gestorTelefone
                            ? telefoneFormatado(l.gestorTelefone)
                            : "sem telefone"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                          {alerta.toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Filtrar:
          </span>
          <Link
            href="/mensagens"
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 ring-inset transition ${
              !status && !finalidade
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
            }`}
          >
            Todas ({resumo.total})
          </Link>
          {["ENVIADO", "GERADO", "FALHA"].map((chave) => (
            <Link
              key={chave}
              href={`/mensagens?status=${chave}`}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 ring-inset transition ${
                status === chave
                  ? "bg-slate-900 text-white ring-slate-900"
                  : `${STATUS_CHIP[chave]} hover:brightness-95`
              }`}
            >
              {STATUS_LABEL[chave]}
            </Link>
          ))}
          <span className="mx-1 h-4 w-px bg-slate-200" />
          {porFinalidade.map((f) => {
            const info = finalidadeInfo(f.finalidade);
            return (
              <Link
                key={f.finalidade}
                href={`/mensagens?finalidade=${f.finalidade}`}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 ring-inset transition ${
                  finalidade === f.finalidade
                    ? "bg-slate-900 text-white ring-slate-900"
                    : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                }`}
              >
                {info.emoji} {info.label} · {f.total}
              </Link>
            );
          })}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {filtradas.length} registro(s) de comunicação
          </h2>
          <p className="text-[11px] text-slate-500">
            {apiAutomatica
              ? "O envio automático pela WhatsApp Cloud API está ativo para mensagens marcadas como “Enviar automaticamente”."
              : "O canal em uso é o link direto do WhatsApp (wa.me) — o texto vai pronto e o envio é confirmado pelo usuário."}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Data / hora</th>
                <th className="px-3 py-2.5 font-semibold">Destinatário</th>
                <th className="px-3 py-2.5 font-semibold">Compromisso</th>
                <th className="px-3 py-2.5 font-semibold">Finalidade</th>
                <th className="px-3 py-2.5 font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Nenhuma mensagem corresponde aos filtros informados.
                  </td>
                </tr>
              ) : (
                filtradas.map(({ mensagem, titulo, dataInicio }) => {
                  const info = finalidadeInfo(mensagem.finalidade);
                  return (
                    <tr key={mensagem.id} className="align-top hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                        <p className="font-semibold text-slate-800">
                          {new Date(mensagem.criadoEm).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-[11px]">
                          {new Date(mensagem.criadoEm).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-800">{mensagem.destinoNome}</p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {mensagem.destinoTelefone}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/compromissos/${mensagem.compromissoId}#whatsapp`}
                          className="font-semibold text-slate-700 hover:text-indigo-700"
                        >
                          {titulo ?? `Compromisso #${mensagem.compromissoId}`}
                        </Link>
                        {dataInicio ? (
                          <p className="text-[11px] text-slate-500">
                            Agendado para {dataInicio}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                          {info.emoji} {info.label}
                        </span>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {mensagem.canal === "API" ? "envio automático" : "link do WhatsApp"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                            STATUS_CHIP[mensagem.status] ?? STATUS_CHIP.GERADO
                          }`}
                        >
                          {STATUS_LABEL[mensagem.status] ?? mensagem.status}
                        </span>
                        {mensagem.enviadoEm ? (
                          <p className="mt-1 text-[10px] text-slate-500">
                            {new Date(mensagem.enviadoEm).toLocaleString("pt-BR")}
                          </p>
                        ) : null}
                        {mensagem.erro ? (
                          <p className="mt-1 text-[10px] font-medium text-rose-600">{mensagem.erro}</p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900">Como o envio funciona</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
            <p className="text-xs font-semibold text-slate-800">
              💬 Envio pelo link direto (padrão, sem configuração)
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              O sistema monta a mensagem com os dados do compromisso e abre o WhatsApp do
              responsável já com o texto pronto. Funciona no WhatsApp Web e no aplicativo, com o
              número da escola/gestor que estiver logado. Depois basta confirmar “Marcar como
              enviada” para fechar o registro.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
            <p className="text-xs font-semibold text-slate-800">
              ⚡ Envio automático (WhatsApp Cloud API)
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              Com <code>WHATSAPP_TOKEN</code> e <code>WHATSAPP_PHONE_ID</code> configurados no
              servidor, o sistema dispara a mensagem direto pelo número oficial da escola (número
              verificado no Meta Business), sem intervenção manual — inclusive lembretes do
              despertador. {apiAutomatica ? "Neste ambiente já está ativo." : "Ainda não configurado."}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Telefones são normalizados automaticamente para o padrão internacional (DDI 55 + DDD +
          número). Cadastre o celular do responsável em <strong>Gestores</strong> para habilitar o
          botão de WhatsApp nos compromissos.
        </p>
      </Card>
    </div>
  );
}
