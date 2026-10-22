import Link from "next/link";
import { CompromissoCard } from "@/components/CompromissoCard";
import { NextCountdown } from "@/components/NextCountdown";
import {
  BarList,
  Card,
  CargoBadge,
  EmptyState,
  SectionTitle,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import {
  CARGOS,
  TIPOS_COLEGIADOS,
  cargoInfo,
  statusInfo,
  tipoInfo,
  tipoLabel,
  turnoInfo,
} from "@/lib/constants";
import { fmtLong, fmtPeriodo, fmtShort, isoToday } from "@/lib/datetime";
import { ESCOLA } from "@/lib/escola";
import {
  listarAuditoria,
  listarCompromissos,
  listarProfessores,
  obterResumo,
  resumoProfessores,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

const CORES_CARGO = ["bg-indigo-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500"];
const CORES_LOCAL = ["bg-teal-500", "bg-sky-500", "bg-indigo-500", "bg-amber-500", "bg-rose-500"];

export default async function PainelPage() {
  const hoje = isoToday();
  const [resumo, agendaHoje, auditoria, colegiadas, professoresPainel, resumoProf, proximos] =
    await Promise.all([
    obterResumo(),
    listarCompromissos({ de: hoje, ate: hoje, sobrepor: true, ordenar: "DATA" }),
    listarAuditoria(8),
    Promise.all(
      TIPOS_COLEGIADOS.map((chave) =>
        listarCompromissos({ tipo: chave, ordenar: "DATA", limite: 40 }),
      ),
    ),
    listarProfessores({ ativo: true }),
    resumoProfessores(),
    listarCompromissos({
      de: hoje,
      ate: "2100-12-31",
      sobrepor: true,
      ordenar: "DATA",
      limite: 6,
    }),
  ]);
  const compromissosColegiados = colegiadas.flat();
  const docentesDestaque = professoresPainel.slice(0, 5);
  const resumoDocentes = resumoProf;

  const porCargo = CARGOS.map((cargo) => ({
    chave: cargo.label,
    total: resumo.porCargo.find((c) => c.chave === cargo.key)?.total ?? 0,
  }));
  const porStatus = resumo.porStatus.map((s) => ({
    chave: statusInfo(s.chave).label,
    total: s.total,
  }));
  const locais = resumo.porLocal.slice(0, 6);
  const proximosDias = resumo.proximos7;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
            {ESCOLA.nome} · Painel da gestão escolar
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Agenda de compromissos
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            {fmtLong(hoje)} · diretor, vice-diretor, coordenação de gestão pedagógica geral e
            gerência de organização escolar em um só lugar, com despertador de compromissos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/compromissos/novo"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            ＋ Agendar compromisso
          </Link>
          <Link
            href="/agenda"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            Ver agenda completa
          </Link>
          <a
            href="/api/public/v1/agenda.ics"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            ⤓ Assinar agenda (.ics)
          </a>
          <Link
            href="/testes"
            className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            ⚗ Sandbox de testes
          </Link>
        </div>
      </header>

      {resumo.total === 0 ? (
        <Card className="p-6">
          <EmptyState
            title={`Agenda da ${ESCOLA.nome} pronta para uso`}
            description="Banco de dados limpo e conectado. Cadastre a equipe de gestão e registre os primeiros compromissos reais — orientações pedagógicas, reuniões da APM, do Conselho de Escola e do Grêmio Estudantil."
            action={
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Link
                  href="/gestores"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                >
                  ① Cadastrar equipe de gestão
                </Link>
                <Link
                  href="/compromissos/novo"
                  className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50"
                >
                  ② Agendar primeiro compromisso
                </Link>
                <Link
                  href="/configuracao"
                  className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50"
                >
                  ③ Conferir banco Supabase
                </Link>
              </div>
            }
          />
        </Card>
      ) : null}

      {resumo.proximo ? (
        <NextCountdown
          item={{
            id: resumo.proximo.id,
            titulo: resumo.proximo.titulo,
            assunto: resumo.proximo.assunto,
            tipo: resumo.proximo.tipo,
            cargoResponsavel: resumo.proximo.cargoResponsavel,
            local: resumo.proximo.local,
            dataInicio: resumo.proximo.dataInicio,
            dataFim: resumo.proximo.dataFim,
            horaInicio: resumo.proximo.horaInicio,
            horaFim: resumo.proximo.horaFim,
            prioridade: resumo.proximo.prioridade,
            status: resumo.proximo.status,
            gestorNome: resumo.proximo.gestorNome,
            participantes: resumo.proximo.participantes,
          }}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Compromissos hoje" value={resumo.hoje} hint="Considerando o dia atual" icon="📌" />
        <StatCard
          label="Semana atual"
          value={resumo.semana}
          accent="emerald"
          hint="Segunda a domingo"
          icon="🗓️"
        />
        <StatCard
          label="Próximos 7 dias"
          value={proximosDias}
          accent="brand"
          hint="Janela de planejamento"
          icon="⏭️"
        />
        <StatCard
          label="Realizados no mês"
          value={resumo.realizadosMes}
          accent="slate"
          hint="Com baixa registrada"
          icon="✅"
        />
        <StatCard
          label="Pendentes de baixa"
          value={resumo.atrasados}
          accent={resumo.atrasados > 0 ? "rose" : "emerald"}
          hint="Datas já encerradas sem baixa"
          icon="⚠️"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <SectionTitle
            title="Agenda de hoje"
            subtitle={`${agendaHoje.length} compromisso(s) programado(s) para hoje`}
            action={
              <Link
                href="/agenda?periodo=HOJE"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Filtrar pela agenda →
              </Link>
            }
          />
          <div className="mt-4 space-y-3">
            {agendaHoje.length === 0 ? (
              <EmptyState
                title="Nenhum compromisso para hoje"
                description="Aproveite para planejar a semana ou cadastrar uma nova orientação pedagógica."
              />
            ) : (
              agendaHoje.map((item) => (
                <CompromissoCard key={item.id} item={item} compacto />
              ))
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <SectionTitle title="Organização por cargo" subtitle="Distribuição dos compromissos" />
            <div className="mt-4">
              <BarList items={porCargo} total={resumo.total} colors={CORES_CARGO} />
            </div>
            <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
              {CARGOS.map((cargo) => (
                <Link
                  key={cargo.key}
                  href={`/agenda?cargo=${cargo.key}&periodo=TODOS&agrupamento=DATA`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition hover:bg-slate-50"
                >
                  <CargoBadge cargo={cargo.key} compact />
                  <span className="font-semibold text-slate-500">
                    {resumo.porCargo.find((c) => c.chave === cargo.key)?.total ?? 0} itens
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Locais mais utilizados" subtitle="Organização da ocupação dos espaços" />
            <div className="mt-4">
              <BarList items={locais} total={resumo.total} colors={CORES_LOCAL} />
            </div>
            <Link
              href="/locais"
              className="mt-4 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Ver todos os locais e ocupações →
            </Link>
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Agenda do corpo docente"
          subtitle="Cada professor tem agenda própria: as convocações da gestão chegam no celular dele via .ics e WhatsApp"
          action={
            <Link
              href="/professores"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Gerenciar professores →
            </Link>
          }
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Professores
                </p>
                <p className="text-2xl font-semibold text-slate-900">{resumoDocentes.total}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Convocações
                </p>
                <p className="text-2xl font-semibold text-emerald-600">{resumoDocentes.convocacoes}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Com agenda ativa
                </p>
                <p className="text-2xl font-semibold text-slate-900">{resumoDocentes.comCompromissos}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Disciplinas
                </p>
                <p className="text-2xl font-semibold text-slate-900">{resumoDocentes.disciplinas}</p>
              </div>
            </div>
            <Link
              href="/compromissos/novo?tipo=HTPC"
              className="mt-4 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
            >
              ＋ Agendar HTPC / formação docente
            </Link>
          </div>
          <div>
            {docentesDestaque.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3.5 py-4 text-xs text-slate-500 ring-1 ring-slate-200">
                Nenhum professor cadastrado ainda. Em Professores você registra o corpo docente por
                disciplina, turmas e turno e passa a convocá-los nas orientações pedagógicas, HTPC,
                conselhos de classe e reuniões de pais.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {docentesDestaque.map((docente) => (
                  <li
                    key={docente.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/professores/${docente.id}`}
                        className="text-xs font-semibold text-slate-800 hover:text-indigo-700"
                      >
                        {docente.nome}
                      </Link>
                      <p className="text-[11px] text-slate-500">
                        {[docente.disciplina, docente.turmas, turnoInfo(docente.turno).label]
                          .filter(Boolean)
                          .join(" · ") || "dados complementares não informados"}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {docente.totalCompromissos} convocação(ões)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle
          title="Reuniões colegiadas da comunidade escolar"
          subtitle="APM, Conselho de Escola e Grêmio Estudantil — agende com um clique, com pauta e público já sugeridos"
          action={
            <Link
              href="/agenda?tipo=REUNIAO_APM&periodo=TODOS"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Ver todas na agenda →
            </Link>
          }
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {TIPOS_COLEGIADOS.map((chave) => {
            const info = tipoInfo(chave);
            const doTipo = resumo.porTipo.find((t) => t.chave === chave)?.total ?? 0;
            const agendaDoTipo = compromissosColegiados
              .filter((c) => c.tipo === chave && c.dataFim >= hoje && c.status !== "CANCELADO")
              .slice(0, 2);
            return (
              <div
                key={chave}
                className="flex flex-col justify-between rounded-xl border border-slate-200 p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${info.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${info.bar}`} />
                      {info.sigla}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {doTipo} na agenda
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-slate-900">{info.label}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    {info.descricao}
                  </p>
                  <ul className="mt-2.5 space-y-1">
                    {agendaDoTipo.length === 0 ? (
                      <li className="text-[11px] text-slate-400">
                        Nenhuma reunião agendada até o momento.
                      </li>
                    ) : (
                      agendaDoTipo.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={`/compromissos/${item.id}`}
                            className="text-[11px] font-semibold text-slate-700 hover:text-indigo-700"
                          >
                            {fmtShort(item.dataInicio)} {item.horaInicio} · {item.local}
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/compromissos/novo?tipo=${chave}`}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-indigo-700"
                  >
                    ＋ Agendar
                  </Link>
                  <Link
                    href={`/agenda?tipo=${chave}&periodo=TODOS&agrupamento=DATA`}
                    className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  >
                    Histórico
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="p-5">
          <SectionTitle title="Situação da agenda" subtitle="Controle de execução" />
          <div className="mt-4">
            <BarList
              items={porStatus}
              total={resumo.total}
              colors={["bg-sky-500", "bg-emerald-500", "bg-indigo-500", "bg-slate-400", "bg-amber-500", "bg-rose-500"]}
            />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Tipos de compromisso" subtitle="Perfil da demanda da gestão" />
          <div className="mt-4">
            <BarList
              items={resumo.porTipo.map((t) => ({ chave: tipoLabel(t.chave), total: t.total }))}
              total={resumo.total}
              colors={["bg-emerald-500", "bg-indigo-500", "bg-violet-500", "bg-teal-500", "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-slate-400"]}
            />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle
            title="Movimentações recentes"
            subtitle="Trilha de auditoria do banco interno"
          />
          <ul className="mt-4 space-y-3">
            {auditoria.length === 0 ? (
              <li className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                Nenhuma movimentação registrada ainda.
              </li>
            ) : (
              auditoria.map((registro) => (
                <li key={registro.id} className="flex gap-3">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      registro.acao === "EXCLUIR"
                        ? "bg-rose-500"
                        : registro.acao === "CRIAR"
                          ? "bg-emerald-500"
                          : "bg-indigo-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700">{registro.detalhe}</p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(registro.criadoEm).toLocaleString("pt-BR")} · {registro.entidade} #
                      {registro.entidadeId ?? "—"}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Próximos compromissos da gestão"
          subtitle="Ordenados por data e hora — acompanhe o que vem a seguir"
          action={
            <Link
              href="/compromissos/novo"
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50"
            >
              ＋ Novo compromisso
            </Link>
          }
        />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {proximos.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 p-3.5 transition hover:border-indigo-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {fmtPeriodo(item.dataInicio, item.dataFim, item.horaInicio, item.horaFim)}
                  </p>
                  <Link
                    href={`/compromissos/${item.id}`}
                    className="mt-0.5 block truncate text-sm font-semibold text-slate-900 hover:text-indigo-700"
                  >
                    {item.titulo}
                  </Link>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {item.local} · {cargoInfo(item.cargoResponsavel).short}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
