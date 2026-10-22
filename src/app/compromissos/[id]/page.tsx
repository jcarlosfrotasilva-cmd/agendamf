import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusActions } from "@/components/StatusActions";
import { WhatsAppComposer } from "@/components/WhatsAppComposer";
import { Card, CargoBadge, PrioridadeBadge, StatusBadge, TipoBadge } from "@/components/ui";
import { cargoInfo, tipoLabel, turnoInfo } from "@/lib/constants";
import { fmtDuracao, fmtLong, duracaoMinutos, isoToday } from "@/lib/datetime";
import { cloudApiConfigurada, telefoneFormatado } from "@/lib/whatsapp";
import { montarDestinatarios, montarModelos } from "@/lib/whatsapp-servidor";
import {
  listarCompromissos,
  listarGestores,
  listarMensagens,
  listarProfessoresDoCompromisso,
  obterCompromisso,
} from "@/lib/repo";
import { headers } from "next/headers";

async function urlBase() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export const dynamic = "force-dynamic";

export default async function CompromissoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isFinite(numero) || numero <= 0) notFound();

  const item = await obterCompromisso(numero);
  if (!item) notFound();

  const hoje = isoToday();
  const [mesmoLocal, mesmoCargo, gestores, docentesConvocados, mensagens, base] = await Promise.all([
    listarCompromissos({
      local: item.local,
      de: hoje,
      ate: "2100-12-31",
      sobrepor: true,
      ordenar: "DATA",
      limite: 6,
    }),
    listarCompromissos({
      cargo: item.cargoResponsavel,
      de: hoje,
      ate: "2100-12-31",
      sobrepor: true,
      ordenar: "DATA",
      limite: 6,
    }),
    listarGestores(),
    listarProfessoresDoCompromisso(item.id),
    listarMensagens({ compromissoId: item.id, limite: 40 }),
    urlBase(),
  ]);

  const destinatarios = montarDestinatarios(
    item,
    gestores.map((g) => ({
      id: g.id,
      nome: g.nome,
      cargo: g.cargo,
      telefone: g.telefone,
    })),
  );
  const modelos = montarModelos(item, base);

  const destinatariosComDocentes = [
    ...destinatarios,
    ...docentesConvocados
      .filter((d) => !destinatarios.some((x) => x.id === d.id && x.nome === d.nome))
      .map((d) => ({
        id: null,
        nome: d.nome,
        cargo: item.cargoResponsavel,
        telefone: d.telefone,
        rotulo: `Professor(a): ${d.nome}${d.disciplina ? ` — ${d.disciplina}` : ""}${
          d.telefone ? ` (${telefoneFormatado(d.telefone)})` : " (sem telefone)"
        }`,
      })),
  ];

  const info = cargoInfo(item.cargoResponsavel);
  const duracao = duracaoMinutos(item.dataInicio, item.dataFim, item.horaInicio, item.horaFim);
  const lembrete =
    item.lembreteMinutos < 60
      ? `${item.lembreteMinutos} minutos antes`
      : item.lembreteMinutos === 60
        ? "1 hora antes"
        : item.lembreteMinutos === 1440
          ? "1 dia antes"
          : `${item.lembreteMinutos / 60} horas antes`;

  return (
    <div className="space-y-5">
      <nav className="text-[11px] text-slate-500">
        <Link href="/" className="hover:text-indigo-600">
          Painel
        </Link>{" "}
        / <Link href="/agenda" className="hover:text-indigo-600">Agenda</Link> /{" "}
        <span className="font-semibold text-slate-700">Compromisso #{item.id}</span>
      </nav>

      <header className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className={`h-1.5 w-full bg-gradient-to-r ${info.accent}`} />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <TipoBadge tipo={item.tipo} />
            <StatusBadge status={item.status} />
            <PrioridadeBadge prioridade={item.prioridade} />
            {item.despertadorAtivo ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                🔔 Despertador ativo · {lembrete}
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                🔕 Sem despertador
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {item.titulo}
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-600">{item.assunto}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Data de início
              </p>
              <p className="text-sm font-semibold text-slate-800">{fmtLong(item.dataInicio)}</p>
              <p className="font-mono text-[11px] text-slate-500">{item.horaInicio}h</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Data fim
              </p>
              <p className="text-sm font-semibold text-slate-800">{fmtLong(item.dataFim)}</p>
              <p className="font-mono text-[11px] text-slate-500">{item.horaFim}h</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Local
              </p>
              <p className="text-sm font-semibold text-slate-800">{item.local}</p>
              <p className="text-[11px] text-slate-500">Duração: {fmtDuracao(duracao)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Responsável
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {item.gestorNome ?? info.short}
              </p>
              <p className="text-[11px] text-slate-500">{info.label}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <CargoBadge cargo={item.cargoResponsavel} />
            <Link
              href={`/agenda?cargo=${item.cargoResponsavel}&periodo=TODOS`}
              className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Ver compromissos deste cargo
            </Link>
            <Link
              href={`/agenda?local=${encodeURIComponent(item.local)}&periodo=TODOS`}
              className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Organizar por este local
            </Link>
            <a
              href={`/api/public/v1/agenda?cargo=${item.cargoResponsavel}&formato=ics`}
              className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Feed .ics por cargo
            </a>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Pauta e descrição</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {item.descricao ?? "Nenhuma descrição detalhada registrada para este compromisso."}
            </p>
            <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-500">
                  Participantes
                </dt>
                <dd className="mt-0.5 text-slate-700">
                  {item.participantes ?? "Não informado"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-500">
                  Tipo de compromisso
                </dt>
                <dd className="mt-0.5 text-slate-700">{tipoLabel(item.tipo)}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-500">
                  Registrado em
                </dt>
                <dd className="mt-0.5 text-slate-700">
                  {new Date(item.criadoEm).toLocaleString("pt-BR")}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-500">
                  Última atualização
                </dt>
                <dd className="mt-0.5 text-slate-700">
                  {new Date(item.atualizadoEm).toLocaleString("pt-BR")}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Professores convocados ({docentesConvocados.length})
                </h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  Estes docentes recebem o compromisso na agenda própria (feed iCalendar) e podem ser
                  avisados por WhatsApp individualmente.
                </p>
              </div>
              <Link
                href={`/compromissos/${item.id}/editar`}
                className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50"
              >
                ✏️ Alterar convocações
              </Link>
            </div>

            {docentesConvocados.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] text-slate-500">
                Nenhum professor convocado nominalmente. Edite o compromisso para selecionar o corpo
                docente, ou{" "}
                <Link href="/professores" className="font-semibold text-indigo-600 hover:text-indigo-700">
                  cadastre professores
                </Link>{" "}
                se o corpo docente ainda não estiver registrado.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {docentesConvocados.map((docente) => (
                  <li key={docente.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
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
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {docente.telefone ? (
                        <span className="rounded-full bg-[#25D366]/10 px-2.5 py-1 text-[11px] font-semibold text-[#128C7E] ring-1 ring-inset ring-[#25D366]/30">
                          {telefoneFormatado(docente.telefone)}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                          sem WhatsApp
                        </span>
                      )}
                      <Link
                        href={`/professores/${docente.id}`}
                        className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        Agenda
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5" id="whatsapp">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#25D366]/15 text-[11px] text-[#128C7E]">
                    ⬤
                  </span>
                  Enviar mensagem pelo WhatsApp
                </h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  Comunique o responsável pelo compromisso com o texto pronto (convite, lembrete,
                  alteração ou cancelamento). Cada envio fica registrado no histórico.
                </p>
              </div>
              {item.gestorTelefone ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  {telefoneFormatado(item.gestorTelefone)}
                </span>
              ) : (
                <Link
                  href="/gestores"
                  className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"
                >
                  Cadastrar telefone do responsável →
                </Link>
              )}
            </div>

            <div className="mt-4">
              <WhatsAppComposer
                compromissoId={item.id}
                compromissoTitulo={item.titulo}
                destinatarios={destinatariosComDocentes}
                modelos={modelos}
                apiAutomatica={cloudApiConfigurada()}
                historico={mensagens.map((m) => ({
                  id: m.id,
                  destinoNome: m.destinoNome,
                  destinoTelefone: m.destinoTelefone,
                  finalidade: m.finalidade,
                  status: m.status,
                  canal: m.canal,
                  erro: m.erro,
                  criadoEm: m.criadoEm.toISOString(),
                  enviadoEm: m.enviadoEm ? m.enviadoEm.toISOString() : null,
                  mensagem: m.mensagem,
                }))}
              />
            </div>
          </Card>

          <StatusActions id={item.id} status={item.status} />
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Outros compromissos em {item.local}
            </h2>
            <ul className="mt-3 space-y-2.5">
              {mesmoLocal.filter((outro) => outro.id !== item.id).length === 0 ? (
                <li className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  Nenhum outro compromisso futuro neste local.
                </li>
              ) : (
                mesmoLocal
                  .filter((outro) => outro.id !== item.id)
                  .map((outro) => (
                    <li key={outro.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/compromissos/${outro.id}`}
                          className="block truncate text-xs font-semibold text-slate-800 hover:text-indigo-700"
                        >
                          {outro.titulo}
                        </Link>
                        <p className="text-[11px] text-slate-500">
                          {outro.dataInicio} · {outro.horaInicio} → {outro.horaFim}
                        </p>
                      </div>
                      <StatusBadge status={outro.status} />
                    </li>
                  ))
              )}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Próximos do cargo · {info.short}
            </h2>
            <ul className="mt-3 space-y-2.5">
              {mesmoCargo.filter((outro) => outro.id !== item.id).length === 0 ? (
                <li className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  Nenhum outro compromisso futuro para este cargo.
                </li>
              ) : (
                mesmoCargo
                  .filter((outro) => outro.id !== item.id)
                  .map((outro) => (
                    <li key={outro.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/compromissos/${outro.id}`}
                          className="block truncate text-xs font-semibold text-slate-800 hover:text-indigo-700"
                        >
                          {outro.titulo}
                        </Link>
                        <p className="text-[11px] text-slate-500">
                          {outro.local} · {outro.dataInicio} {outro.horaInicio}
                        </p>
                      </div>
                      <StatusBadge status={outro.status} />
                    </li>
                  ))
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
