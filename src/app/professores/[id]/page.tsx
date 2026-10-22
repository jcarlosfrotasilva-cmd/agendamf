import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AgendaSemanaProfessor } from "@/components/AgendaSemanaProfessor";
import { CompromissoLista } from "@/components/CompromissoLista";
import { Card, StatCard, StatusBadge, TipoBadge } from "@/components/ui";
import { ESCOLA } from "@/lib/escola";
import { turnoInfo } from "@/lib/constants";
import { fmtDuracao, fmtLong, duracaoMinutos, isoToday, labelDiaCurto } from "@/lib/datetime";
import { telefoneFormatado } from "@/lib/whatsapp";
import { listarCompromissos, obterProfessor } from "@/lib/repo";

export const dynamic = "force-dynamic";

async function urlBase() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function AgendaProfessorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isFinite(numero) || numero <= 0) notFound();

  const professor = await obterProfessor(numero);
  if (!professor) notFound();

  const hoje = isoToday();
  const [todos, base] = await Promise.all([
    listarCompromissos({
      professorId: numero,
      periodo: "TODOS",
      incluirCancelados: true,
      ordenar: "DATA",
      limite: 400,
    }),
    urlBase(),
  ]);

  const proximos = todos.filter((i) => i.dataFim >= hoje && i.status !== "CANCELADO");
  const historico = todos.filter((i) => i.dataFim < hoje || i.status === "REALIZADO").reverse();
  const hojeLista = todos.filter((i) => i.dataInicio <= hoje && i.dataFim >= hoje && i.status !== "CANCELADO");
  const horasSemana = proximos
    .filter((i) => i.dataInicio >= hoje && i.dataInicio <= hoje.slice(0, 8) + "31")
    .reduce(
      (total, i) => total + duracaoMinutos(i.dataInicio, i.dataFim, i.horaInicio, i.horaFim),
      0,
    );
  const porTipo = new Map<string, number>();
  for (const item of todos) porTipo.set(item.tipo, (porTipo.get(item.tipo) ?? 0) + 1);
  const tiposOrdenados = Array.from(porTipo.entries()).sort((a, b) => b[1] - a[1]);
  const turno = turnoInfo(professor.turno);

  const proximo = proximos[0] ?? null;

  return (
    <div className="space-y-5">
      <nav className="text-[11px] text-slate-500 no-print">
        <Link href="/" className="hover:text-indigo-600">
          Painel
        </Link>{" "}
        / <Link href="/professores" className="hover:text-indigo-600">Professores</Link> /{" "}
        <span className="font-semibold text-slate-700">{professor.nome}</span>
      </nav>

      <header className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Agenda do professor · {ESCOLA.nome}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {professor.nome}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ring-1 ring-inset ${turno.chip}`}>
                Turno {turno.label}
              </span>
              {professor.disciplina ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                  📚 {professor.disciplina}
                </span>
              ) : null}
              {professor.turmas ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                  🏫 {professor.turmas}
                </span>
              ) : null}
              {professor.telefone ? (
                <span className="rounded-full bg-[#25D366]/12 px-2.5 py-1 font-semibold text-[#128C7E] ring-1 ring-inset ring-[#25D366]/30">
                  💬 {telefoneFormatado(professor.telefone)}
                </span>
              ) : (
                <Link
                  href="/professores"
                  className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"
                >
                  Cadastrar WhatsApp do professor →
                </Link>
              )}
            </div>
            {professor.observacoes ? (
              <p className="mt-2 max-w-2xl text-xs text-slate-500">{professor.observacoes}</p>
            ) : null}
          </div>

          <div className="flex flex-col items-end gap-2">
            <a
              href={`/api/professores/${professor.id}/ics`}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              📅 Assinar agenda do professor (.ics)
            </a>
            <code className="max-w-[280px] truncate rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[10px] text-slate-500 ring-1 ring-slate-200">
              {base}/api/professores/{professor.id}/ics
            </code>
            <span className="text-[10px] text-slate-400">
              Somente leitura · sincroniza sozinho no celular do docente
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Compromissos de hoje"
          value={hojeLista.length}
          hint={fmtLong(hoje)}
          icon="📌"
        />
        <StatCard
          label="Próximos na agenda"
          value={proximos.length}
          accent="emerald"
          hint="Confirmados, agendados e em andamento"
          icon="⏭️"
        />
        <StatCard
          label="Convocações registradas"
          value={todos.length}
          accent="brand"
          hint="Histórico completo do docente"
          icon="📣"
        />
        <StatCard
          label="Carga prevista no mês"
          value={fmtDuracao(horasSemana)}
          accent="amber"
          hint="Somatório das durações agendadas"
          icon="⏱️"
        />
      </div>

      {proximo ? (
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-5 text-white shadow-xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                Próximo compromisso do professor
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">{proximo.titulo}</h2>
              <p className="mt-1 text-sm text-slate-300">{proximo.assunto}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
                <span>🗓️ {labelDiaCurto(proximo.dataInicio)} · {proximo.horaInicio} às {proximo.horaFim}</span>
                <span>📍 {proximo.local}</span>
                <span>👥 {proximo.participantes ?? "Equipe escolar"}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <TipoBadge tipo={proximo.tipo} />
              <StatusBadge status={proximo.status} />
              <Link
                href={`/compromissos/${proximo.id}`}
                className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Abrir compromisso →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Semana do professor</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Aulas, HTPC, orientações, conselhos de classe e reuniões de pais da semana corrente.
            </p>
          </div>
          <Link
            href={`/agenda?periodo=SEMANA&busca=${encodeURIComponent(professor.nome)}`}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 no-print"
          >
            Ver na agenda geral →
          </Link>
        </div>
        <div className="mt-4">
          <AgendaSemanaProfessor itens={proximos} />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Próximos compromissos ({proximos.length})
            </h2>
            <div className="mt-4">
              <CompromissoLista
                itens={proximos}
                agrupamento="DATA"
                tituloVazio="Nenhum compromisso futuro para este professor"
                descricaoVazio="Quando a gestão convocar o docente para uma orientação, HTPC ou reunião, o compromisso aparece aqui automaticamente."
              />
            </div>
          </Card>

          {historico.length > 0 ? (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Histórico do docente ({historico.length})
              </h2>
              <div className="mt-4">
                <CompromissoLista
                  itens={historico.slice(0, 12)}
                  agrupamento="TIPO"
                  mostrarData
                  compacto
                  tituloVazio="Sem histórico registrado"
                />
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Distribuição por tipo</h2>
            {tiposOrdenados.length === 0 ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                Nenhuma convocação registrada ainda.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {tiposOrdenados.map(([chave, total]) => (
                  <li key={chave}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-700">{chave}</span>
                      <span className="font-semibold text-slate-500">{total}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.max((total / todos.length) * 100, 8)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5 no-print">
            <h2 className="text-sm font-semibold text-slate-900">
              Como o professor usa esta agenda
            </h2>
            <ol className="mt-3 space-y-3 text-[11px] leading-relaxed text-slate-600">
              <li className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-600">
                  1
                </span>
                Copie e envie o endereço do feed <code>.ics</code> acima para o professor. No celular,
                ele adiciona a agenda no Google Agenda ou Outlook e passa a receber cada convocação
                automaticamente.
              </li>
              <li className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-600">
                  2
                </span>
                Os avisos de convite, lembrete do despertador e alterações chegam por WhatsApp no
                número cadastrado do docente.
              </li>
              <li className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-600">
                  3
                </span>
                A agenda é somente leitura para o professor: quem cria, altera e dá baixa continua
                sendo a gestão da escola.
              </li>
            </ol>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Dados do cadastro</h2>
            <dl className="mt-3 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Disciplina</dt>
                <dd className="font-semibold text-slate-800">{professor.disciplina ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Turmas</dt>
                <dd className="font-semibold text-slate-800">{professor.turmas ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Turno</dt>
                <dd className="font-semibold text-slate-800">{turno.label}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">E-mail</dt>
                <dd className="truncate font-semibold text-slate-800">{professor.email ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Situação</dt>
                <dd className="font-semibold text-slate-800">
                  {professor.ativo ? "Ativo" : "Inativo"}
                </dd>
              </div>
            </dl>
            <Link
              href="/professores"
              className="mt-4 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-700 no-print"
            >
              Editar cadastro do docente →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
