import Link from "next/link";
import { CompromissoForm } from "@/components/CompromissoForm";
import { Card } from "@/components/ui";
import { LOCAIS_SUGERIDOS, LEMBRETES, PRESETS_TIPO, TIPOS, tipoInfo } from "@/lib/constants";
import { isoToday } from "@/lib/datetime";
import { listarGestores, listarProfessores } from "@/lib/repo";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NovoCompromissoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [gestores, docentes, sp] = await Promise.all([
    listarGestores(),
    listarProfessores({ ativo: true }),
    searchParams,
  ]);
  const tipoParam = Array.isArray(sp.tipo) ? sp.tipo[0] : sp.tipo;
  const tipoSelecionado = TIPOS.find((t) => t.key === tipoParam)?.key ?? "ORIENTACAO_PEDAGOGICA";
  const preset = PRESETS_TIPO[tipoSelecionado];
  const hoje = isoToday();
  const infoTipo = tipoInfo(tipoSelecionado);

  return (
    <div className="space-y-5">
      <nav className="text-[11px] text-slate-500">
        <Link href="/" className="hover:text-indigo-600">
          Painel
        </Link>{" "}
        / <Link href="/agenda" className="hover:text-indigo-600">Agenda</Link> /{" "}
        <span className="font-semibold text-slate-700">Novo compromisso</span>
      </nav>

      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Agendamento
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Novo compromisso da gestão
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Registre orientações pedagógicas, reuniões (APM, Conselho de Escola e Grêmio Estudantil),
          formações, conselhos de classe e visitas técnicas com data de início, data fim, hora,
          assunto e local. O despertador dispara automaticamente na antecedência escolhida.
        </p>
      </header>

      <Card className="no-print p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Atalhos de tipo:
          </span>
          {TIPOS.map((tipo) => (
            <Link
              key={tipo.key}
              href={`/compromissos/novo?tipo=${tipo.key}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 ring-inset transition hover:brightness-95 ${
                tipo.key === tipoSelecionado
                  ? "bg-slate-900 text-white ring-slate-900"
                  : tipo.chip
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tipo.key === tipoSelecionado ? "bg-white" : tipo.bar
                }`}
              />
              {tipo.label}
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <CompromissoForm
          modo="criar"
          gestores={gestores.map((g) => ({ id: g.id, nome: g.nome, cargo: g.cargo }))}
          professores={docentes.map((p) => ({
            id: p.id,
            nome: p.nome,
            disciplina: p.disciplina,
            turmas: p.turmas,
            turno: p.turno,
          }))}
          inicial={{
            tipo: tipoSelecionado,
            titulo: preset ? `${infoTipo.label} — ${hoje.slice(0, 4)}` : "",
            assunto: preset?.assunto ?? "",
            descricao: preset?.pauta ?? "",
            local: preset?.local ?? "",
            participantes: preset?.participantes ?? "",
            lembreteMinutos: String(preset?.lembreteMinutos ?? 30),
            dataInicio: hoje,
            dataFim: hoje,
          }}
        />

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Reuniões colegiadas da escola
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Tipos prontos para os colegiados, com sugestão de pauta, público e antecedência do
              despertador:
            </p>
            <ul className="mt-3 space-y-3">
              {TIPOS.filter((t) => PRESETS_TIPO[t.key]).map((tipo) => (
                <li key={tipo.key}>
                  <Link
                    href={`/compromissos/novo?tipo=${tipo.key}`}
                    className="group block rounded-xl border border-slate-200 p-3 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${tipo.chip}`}
                    >
                      {tipo.sigla} · {tipo.label}
                    </span>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                      {tipo.descricao}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-indigo-600">
                      Agendar este tipo →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Como o agendamento funciona</h2>
            <ol className="mt-3 space-y-3 text-xs text-slate-600">
              <li className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600">
                  1
                </span>
                O compromisso é gravado no banco PostgreSQL interno e aparece imediatamente na
                agenda, no painel e no despertador.
              </li>
              <li className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600">
                  2
                </span>
                O despertador monitora a agenda a cada 30 segundos e avisa com som, notificação do
                navegador e alerta na tela.
              </li>
              <li className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600">
                  3
                </span>
                A consulta externa online fica disponível em /api/public/v1/agenda e no feed
                iCalendar para Google Agenda e Outlook.
              </li>
            </ol>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Locais mais usados</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {LOCAIS_SUGERIDOS.map((local) => (
                <span
                  key={local}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                >
                  {local}
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Antecedências do despertador</h2>
            <p className="mt-1 text-xs text-slate-600">
              {LEMBRETES.map((m) =>
                m < 60 ? `${m}min` : m === 60 ? "1h" : m === 1440 ? "24h" : `${m / 60}h`,
              ).join(" · ")}
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Recomendado: orientações pedagógicas e grêmio 30–60 minutos antes; APM, Conselho de
              Escola, conselhos de classe e eventos 1 dia antes (convocações e documentos).
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
