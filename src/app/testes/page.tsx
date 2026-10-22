import Link from "next/link";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { SandboxRunner } from "@/components/SandboxRunner";
import { Card, StatCard } from "@/components/ui";
import { CARGOS, TIPOS } from "@/lib/constants";
import { isoToday, rangeForPeriodo } from "@/lib/datetime";
import { ESCOLA } from "@/lib/escola";

export const dynamic = "force-dynamic";

async function urlBase() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function estadoBanco() {
  const inicio = performance.now();
  const resultado = await db.execute<{
    gestores: number;
    compromissos: number;
    auditoria: number;
    tokens: number;
    hoje: number;
    colegiadas: number;
  }>(sql`
    select
      (select count(*)::int from gestores) as gestores,
      (select count(*)::int from compromissos) as compromissos,
      (select count(*)::int from auditoria) as auditoria,
      (select count(*)::int from api_tokens) as tokens,
      (select count(*)::int from compromissos
         where data_inicio <= current_date and data_fim >= current_date) as hoje,
      (select count(*)::int from compromissos
         where tipo in ('REUNIAO_APM','REUNIAO_CONSELHO_ESCOLA','REUNIAO_GREMIO_ESTUDANTIL')) as colegiadas
  `);
  const linha = resultado.rows[0];
  return {
    gestores: linha?.gestores ?? 0,
    compromissos: linha?.compromissos ?? 0,
    auditoria: linha?.auditoria ?? 0,
    tokens: linha?.tokens ?? 0,
    hoje: linha?.hoje ?? 0,
    colegiadas: linha?.colegiadas ?? 0,
    latencia: Math.round(performance.now() - inicio),
  };
}

export default async function SandboxPage() {
  const [base, estado] = await Promise.all([urlBase(), estadoBanco()]);
  const hoje = isoToday();
  const semana = rangeForPeriodo("SEMANA", hoje);

  const cenarios = [
    {
      titulo: "1. Despertador de compromisso",
      passos: [
        "Clique em “⏰ Criar alarme em 2 min” acima (ou no botão do widget flutuante).",
        "Aguarde: surge o modal vermelho com contagem regressiva e som.",
        "Teste “Confirmar início” (muda a situação no banco) e “Soneca 5 min”.",
        "Autorize as notificações do navegador no rodapé do widget para receber o aviso do sistema.",
      ],
    },
    {
      titulo: "2. Agendamento completo",
      passos: [
        "Abra Novo Compromisso e escolha o tipo “Reunião da APM”, “Conselho de Escola” ou “Grêmio Estudantil”.",
        "Observe o preenchimento automático de pauta, local, público e antecedência do despertador.",
        "Salve e confira o registro no Painel, na Agenda e no detalhe do compromisso.",
      ],
    },
    {
      titulo: "3. Organização por cargo, data e local",
      passos: [
        "Em Agenda, alterne “Organizar” entre por data, por cargo, por local, por tipo e por situação.",
        "Use os atalhos de cargo e de tipo para filtrar em um clique.",
        "Em Locais, verifique ocupação, cargos envolvidos e próxima ocupação de cada espaço.",
      ],
    },
    {
      titulo: "4. Consulta externa online",
      passos: [
        "Abra Consulta Online e filtre por período, cargo, tipo, local e situação.",
        "Marque “Ver resposta JSON” para inspecionar o retorno da API pública.",
        "Gere uma chave em API Externa e repita a consulta informando a chave para ver os campos detalhados.",
      ],
    },
    {
      titulo: "5. Integração iCalendar",
      passos: [
        "Baixe um .ics individual pelo botão 📅 no card do compromisso.",
        "Assine o feed completo em /api/public/v1/agenda.ics (Google Agenda → A partir do URL).",
        "Verifique o alarme VALARM herdado da antecedência configurada.",
      ],
    },
    {
      titulo: "6. Escrita e validação de dados",
      passos: [
        "Crie e edite compromissos e gestores para validar as regras (data fim ≥ início, hora fim > início).",
        "Tente salvar com data final anterior à inicial para ver a mensagem de validação.",
        "Confira a trilha de auditoria atualizada no Painel.",
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">
            Ambiente de testes · sandbox
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Testes do sistema
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Sistema em operação oficial para {ESCOLA.nome}, com banco PostgreSQL (Supabase) sem
            dados de demonstração. Esta página executa o smoke test de todas as rotas e permite
            validar o despertador de compromissos antes de usar a agenda no dia a dia.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            Ir para o Painel
          </Link>
          <Link
            href="/agenda?periodo=TODOS"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            Abrir Agenda
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Conexão PostgreSQL"
          value={estado.latencia}
          hint={`Latência de consulta em ms · banco ativo`}
          accent="emerald"
          icon="🐘"
        />
        <StatCard
          label="Compromissos na base"
          value={estado.compromissos}
          hint={`${estado.hoje} ocorrendo hoje`}
          icon="🗂️"
        />
        <StatCard
          label="Gestores / cargos"
          value={`${estado.gestores} / ${CARGOS.length}`}
          accent="brand"
          hint="Direção, vice-direção, coordenação e organização"
          icon="👥"
        />
        <StatCard
          label="Reuniões colegiadas"
          value={estado.colegiadas}
          accent="amber"
          hint="APM, Conselho de Escola e Grêmio"
          icon="🏛️"
        />
      </div>

      <SandboxRunner />

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Cenários de teste guiados</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Roteiro recomendado para validar todos os requisitos do sistema.
          </p>
          <div className="mt-4 space-y-4">
            {cenarios.map((cenario) => (
              <section key={cenario.titulo} className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                <h3 className="text-xs font-semibold text-slate-800">{cenario.titulo}</h3>
                <ul className="mt-2 space-y-1.5">
                  {cenario.passos.map((passo) => (
                    <li key={passo} className="flex gap-2 text-[11px] leading-relaxed text-slate-600">
                      <span className="text-indigo-500">▸</span>
                      {passo}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Endereços úteis do ambiente</h2>
            <dl className="mt-3 space-y-2 text-[11px]">
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-500">
                  Base do sandbox
                </dt>
                <dd className="mt-0.5 break-all rounded-lg bg-slate-950 px-3 py-2 font-mono text-emerald-300">
                  {base}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-500">
                  Banco de dados
                </dt>
                <dd className="mt-0.5 break-all rounded-lg bg-slate-950 px-3 py-2 font-mono text-emerald-300">
                  {process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
                    ? `${new URL(
                        process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "",
                      ).protocol}//${new URL(
                        process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "",
                      ).hostname}/***`
                    : "não configurado"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-500">
                  Responsável
                </dt>
                <dd className="mt-0.5 text-slate-600">
                  {ESCOLA.nome} — {ESCOLA.usoExclusivo}. Configure o Supabase em “Banco de Dados”.
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Estado da base de testes</h2>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li className="flex items-center justify-between gap-2">
                <span>Gestores cadastrados</span>
                <span className="font-semibold text-slate-800">{estado.gestores}</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Compromissos registrados</span>
                <span className="font-semibold text-slate-800">{estado.compromissos}</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Compromissos hoje</span>
                <span className="font-semibold text-slate-800">{estado.hoje}</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Semana atual ({semana.de} → {semana.ate})</span>
                <span className="font-semibold text-slate-800">consulta ativa</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Chaves de integração</span>
                <span className="font-semibold text-slate-800">{estado.tokens}</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Registros de auditoria</span>
                <span className="font-semibold text-slate-800">{estado.auditoria}</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Tipos de compromisso disponíveis</span>
                <span className="font-semibold text-slate-800">{TIPOS.length}</span>
              </li>
            </ul>
            <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
              Se a base estiver zerada, cadastre a equipe em “Gestores” e comece a registrar os
              compromissos reais da gestão. O botão “Atualizar estado da base” apenas recarrega as
              contagens do banco — nenhuma limpeza é executada pelo sistema.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Como manter o sandbox ativo</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              O servidor é gerenciado pela plataforma: enquanto o preview estiver publicado, o
              ambiente permanece disponível em <strong>{base}</strong>. Se a página parar de
              responder, basta solicitar nova liberação — o build é preservado e o PostgreSQL local
              continua com os dados.
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Dica: o smoke test desta página é o caminho mais rápido para confirmar que todas as
              rotas (internas, públicas e páginas) estão saudáveis após qualquer alteração.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
