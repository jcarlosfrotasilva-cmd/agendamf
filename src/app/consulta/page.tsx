import Link from "next/link";
import { ConsultaBoard } from "@/components/ConsultaBoard";
import { Card, StatCard } from "@/components/ui";
import { ESCOLA } from "@/lib/escola";
import { obterResumo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function ConsultaPage() {
  const resumo = await obterResumo();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Banco externo · consulta online
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Consulta pública da agenda
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Esta tela consulta em tempo real a API pública <strong>/api/public/v1/agenda</strong>,
            que expõe a agenda da gestão escolar em modo somente-leitura para pais, professores,
            supervisão de ensino, portais institucionais e painéis de BI. O banco interno
            (PostgreSQL) permanece protegido para escrita apenas no sistema.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/public/v1/agenda.ics"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            ⤓ Feed iCalendar
          </a>
          <Link
            href="/api-publica"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Documentação da API
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Compromissos publicados" value={resumo.total} icon="🌐" />
        <StatCard label="Hoje" value={resumo.hoje} accent="emerald" icon="📌" />
        <StatCard label="Próximos 7 dias" value={resumo.proximos7} accent="brand" icon="⏭️" />
        <StatCard
          label="Locais ativos"
          value={resumo.porLocal.length}
          accent="amber"
          hint="Espaços com agenda registrada"
          icon="⌂"
        />
      </div>

      <ConsultaBoard />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Banco de dados interno</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            PostgreSQL no Supabase com Drizzle ORM. Tabelas <code>gestores</code>,{" "}
            <code>compromissos</code>, <code>auditoria</code> e <code>api_tokens</code> guardam a
            agenda oficial de {ESCOLA.nome}, com índices para consulta por data, cargo, local e
            situação.
          </p>
          <ul className="mt-3 space-y-1.5 text-[11px] text-slate-500">
            <li>• Escrita apenas pelo sistema de gestão (API interna autenticada por sessão).</li>
            <li>• Trilha de auditoria de criação, alteração, baixa e exclusão.</li>
            <li>• Registro do despertador por compromisso (antecedência configurável).</li>
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Consulta externa online</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            API REST com CORS liberado (somente leitura), paginação por período e filtros por cargo,
            tipo, local, situação e busca livre. Chaves de integração opcionais liberam campos
            detalhados como pauta e participantes.
          </p>
          <ul className="mt-3 space-y-1.5 text-[11px] text-slate-500">
            <li>
              • <code>/api/public/v1/agenda</code> — lista/tabela completa
            </li>
            <li>
              • <code>/api/public/v1/resumo</code> — indicadores agregados
            </li>
            <li>
              • <code>/api/public/v1/agenda.ics</code> — assinatura em Google Agenda/Outlook
            </li>
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Assinar no Google Agenda</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            No Google Agenda, use <strong>Outros calendários → A partir do URL</strong> e cole o
            endereço abaixo. O feed é atualizado automaticamente e já inclui o despertador de cada
            compromisso.
          </p>
          <code className="mt-3 block overflow-x-auto rounded-lg bg-slate-950 px-3 py-2 font-mono text-[11px] text-emerald-300">
            /api/public/v1/agenda.ics
          </code>
          <p className="mt-2 text-[11px] text-slate-500">
            Filtros disponíveis no feed: <code>?cargo=COORDENADOR_PEDAGOGICO</code>,{" "}
            <code>?local=Auditório</code>, <code>?periodo=SEMANA</code>.
          </p>
        </Card>
      </div>
    </div>
  );
}
