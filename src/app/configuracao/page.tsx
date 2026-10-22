import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, databaseHost, isLocalDatabase, isSupabase } from "@/db";
import { CopyBlock } from "@/components/CopyBlock";
import { Card, StatCard } from "@/components/ui";
import { ESCOLA } from "@/lib/escola";
import { MANUTENCAO_SQL, SCHEMA_SQL } from "@/lib/schema-sql";
import { PROVEDORES, provedorAtivo } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

type Estado = {
  conectado: boolean;
  schemaPronto: boolean;
  tabelas: string[];
  contagens: {
    compromissos: number;
    gestores: number;
    auditoria: number;
    tokens: number;
    mensagens: number;
  };
  latencia: number;
  erro?: string;
};

async function estadoBanco(): Promise<Estado> {
  const inicio = performance.now();
  try {
    await db.execute(sql`select 1`);
    const tabelas = await db.execute<{ tabela: string }>(sql`
      select tablename as tabela
      from pg_tables
      where schemaname = 'public'
      order by tablename
    `);
    const lista = tabelas.rows.map((r) => r.tabela);
    const obrigatorias = [
      "gestores",
      "compromissos",
      "auditoria",
      "api_tokens",
      "mensagens_whatsapp",
    ];
    const schemaPronto = obrigatorias.every((t) => lista.includes(t));

    let contagens = { compromissos: 0, gestores: 0, auditoria: 0, tokens: 0, mensagens: 0 };
    if (schemaPronto) {
      const resultado = await db.execute<{
        compromissos: number;
        gestores: number;
        auditoria: number;
        tokens: number;
        mensagens: number;
      }>(sql`
        select
          (select count(*)::int from compromissos) as compromissos,
          (select count(*)::int from gestores) as gestores,
          (select count(*)::int from auditoria) as auditoria,
          (select count(*)::int from api_tokens) as tokens,
          (select count(*)::int from mensagens_whatsapp) as mensagens
      `);
      const linha = resultado.rows[0];
      contagens = {
        compromissos: linha?.compromissos ?? 0,
        gestores: linha?.gestores ?? 0,
        auditoria: linha?.auditoria ?? 0,
        tokens: linha?.tokens ?? 0,
        mensagens: linha?.mensagens ?? 0,
      };
    }

    return {
      conectado: true,
      schemaPronto,
      tabelas: lista,
      contagens,
      latencia: Math.round(performance.now() - inicio),
    };
  } catch (error) {
    return {
      conectado: false,
      schemaPronto: false,
      tabelas: [],
      contagens: { compromissos: 0, gestores: 0, auditoria: 0, tokens: 0, mensagens: 0 },
      latencia: Math.round(performance.now() - inicio),
      erro: error instanceof Error ? error.message : "falha desconhecida",
    };
  }
}

export default async function ConfiguracaoPage() {
  const estado = await estadoBanco();
  const provedor = isSupabase() ? "Supabase" : isLocalDatabase() ? "PostgreSQL local" : "PostgreSQL externo";
  const pronto = estado.conectado && estado.schemaPronto;
  const baseLimpa =
    estado.contagens.compromissos === 0 && estado.contagens.gestores === 0;

  const passos = [
    {
      titulo: "1. Criar o projeto no Supabase",
      texto:
        "Acesse supabase.com, crie um novo projeto para a escola e aguarde a inicialização do banco. Guarde a senha do banco definida na criação.",
    },
    {
      titulo: "2. Copiar a connection string",
      texto:
        "Em Project Settings → Database → Connection string, copie o formato URI (Session pooler ou Direct connection). Ela se parece com: postgresql://postgres.[projeto]:[senha]@aws-0-[região].pooler.supabase.com:5432/postgres",
    },
    {
      titulo: "3. Configurar a variável de ambiente",
      texto:
        "Defina SUPABASE_DB_URL (ou DATABASE_URL) nas variáveis de ambiente do sistema hospedado. Nunca coloque essa string no navegador nem no código-fonte: ela dá acesso total ao banco.",
    },
    {
      titulo: "4. Criar a estrutura das tabelas",
      texto:
        "Execute o script SQL abaixo no SQL Editor do Supabase (ou rode npx drizzle-kit push localmente). O sistema então criará gestores e compromissos reais.",
    },
    {
      titulo: "5. Conferir e operar",
      texto:
        "Recarregue esta página: os cards devem mostrar “conectado” e “estrutura criada”. A base está limpa, sem nenhum dado de demonstração — pronta para uso oficial.",
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Configuração do banco de dados
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Supabase · {ESCOLA.nome}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            O sistema opera sobre PostgreSQL gerenciado no Supabase. Esta página mostra o estado da
            conexão, o script para criação da estrutura e os comandos de manutenção. O banco usado
            pela escola está limpo: nenhum compromisso ou gestor de demonstração permanece.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/testes"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            ⚗ Rodar smoke test
          </Link>
          <Link
            href="/gestores"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            Cadastrar equipe de gestão
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Conexão"
          value={estado.conectado ? "Ativa" : "Falha"}
          accent={estado.conectado ? "emerald" : "rose"}
          hint={estado.conectado ? `${provedor} · ${estado.latencia} ms` : estado.erro ?? "sem conexão"}
          icon={estado.conectado ? "🟢" : "🔴"}
        />
        <StatCard
          label="Estrutura de tabelas"
          value={estado.schemaPronto ? "Criada" : "Pendente"}
          accent={estado.schemaPronto ? "emerald" : "amber"}
          hint={estado.schemaPronto ? "4 tabelas verificadas" : "Execute o script SQL abaixo"}
          icon="🧱"
        />
        <StatCard
          label="Dados de demonstração"
          value={baseLimpa ? "Removidos" : "Presentes"}
          accent={baseLimpa ? "emerald" : "amber"}
          hint={
            baseLimpa
              ? "Base limpa, pronta para uso oficial"
              : `${estado.contagens.compromissos} compromisso(s) e ${estado.contagens.gestores} gestor(es) na base`
          }
          icon="🧹"
        />
        <StatCard
          label="Registros reais"
          value={estado.contagens.compromissos}
          accent="brand"
          hint={`${estado.contagens.gestores} gestor(es) · ${estado.contagens.auditoria} registro(s) de auditoria`}
          icon="🗂️"
        />
      </div>

      {!pronto ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
          {estado.conectado
            ? "Conexão estabelecida, mas a estrutura ainda não foi criada. Execute o script SQL abaixo no SQL Editor do Supabase."
            : "Não foi possível conectar ao banco configurado. Verifique a variável SUPABASE_DB_URL/DATABASE_URL."}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Diagnóstico da conexão</h2>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Variável em uso</dt>
                <dd className="font-mono text-[11px] font-semibold text-slate-800">
                  {process.env.SUPABASE_DB_URL ? "SUPABASE_DB_URL" : "DATABASE_URL"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Host / banco</dt>
                <dd className="font-mono text-[11px] font-semibold text-slate-800">
                  {databaseHost()}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Provedor detectado</dt>
                <dd className="font-semibold text-slate-800">{provedor}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Criptografia (TLS)</dt>
                <dd className="font-semibold text-slate-800">
                  {isLocalDatabase() ? "não exigida (local)" : "obrigatória e ativa"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Latência de consulta</dt>
                <dd className="font-semibold text-slate-800">{estado.latencia} ms</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
              Tabelas encontradas no schema public:{" "}
              {estado.tabelas.length > 0 ? estado.tabelas.join(", ") : "nenhuma"}.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Passo a passo para conectar o Supabase
            </h2>
            <ol className="mt-3 space-y-3">
              {passos.map((passo) => (
                <li key={passo.titulo} className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold text-slate-800">{passo.titulo}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{passo.texto}</p>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Variáveis de ambiente</h2>
            <p className="mt-1 text-xs text-slate-600">
              Configure no ambiente do servidor (nunca no cliente). O sistema prioriza{" "}
              <code>SUPABASE_DB_URL</code> e usa <code>DATABASE_URL</code> como alternativa.
            </p>
            <div className="mt-3">
              <CopyBlock
                titulo=".env.local / variáveis do servidor"
                linhas={8}
                conteudo={`# Banco de dados Supabase (uso exclusivo ${ESCOLA.nome})
SUPABASE_DB_URL=postgresql://postgres.SEU_PROJETO:SUA_SENHA@aws-0-REGIao.pooler.supabase.com:5432/postgres?sslmode=require

# Identidade exibida no sistema
NEXT_PUBLIC_ESCOLA_NOME="${ESCOLA.nome}"
NEXT_PUBLIC_ESCOLA_SIGLA="${ESCOLA.sigla}"`}
              />
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              Se preferir usar o pooler do Supabase na porta 6543 (indicado para ambientes
              serverless), o sistema ajusta automaticamente o tamanho do pool.
            </p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Script de criação da estrutura (Supabase SQL Editor)
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Cria as tabelas <code>gestores</code>, <code>compromissos</code>, <code>auditoria</code>{" "}
              e <code>api_tokens</code>, os índices, as regras de integridade e o gatilho de
              atualização automática. Alternativa por linha de comando:{" "}
              <code>npx drizzle-kit push</code>.
            </p>
            <div className="mt-3">
              <CopyBlock titulo="supabase/schema.sql" conteudo={SCHEMA_SQL} linhas={22} />
            </div>
            <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200">
              <strong className="font-semibold text-slate-800">Sobre segurança no Supabase:</strong> o
              sistema acessa o banco apenas pelo servidor (Next.js), usando a connection string
              completa. Mantenha essa variável restrita e não habilite RLS esperando que a aplicação
              funcione pelo navegador — não há chave anônima nem supabase-js no cliente.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              WhatsApp: envio manual e envio automático
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              O envio pelo link direto (<code>wa.me</code>) funciona sem nenhuma configuração: o
              sistema monta o texto com os dados do compromisso e abre o WhatsApp do responsável.
              Para disparar automaticamente pelo número oficial da escola, configure as credenciais
              da <strong>WhatsApp Cloud API</strong> (Meta) no servidor.
            </p>
            <div className="mt-3 space-y-2">
              {PROVEDORES.map((p) => {
                const ativo = provedorAtivo() === p.key;
                return (
                  <div
                    key={p.key}
                    className={`rounded-xl border p-3 ${
                      ativo ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800">{p.label}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                          ativo
                            ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
                            : "bg-slate-100 text-slate-500 ring-slate-200"
                        }`}
                      >
                        {ativo ? "em uso" : "disponível"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{p.descricao}</p>
                    <p className="mt-1 font-mono text-[10px] text-slate-500">
                      {p.variaveis.join(" · ")}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="mt-3">
              <CopyBlock
                titulo="variáveis do DISPARO AUTOMÁTICO (.env do servidor)"
                linhas={18}
                conteudo={`# Escolha o provedor (opcional — o sistema detecta automaticamente)
WHATSAPP_PROVIDER=zapi

# --- Z-API (WhatsApp comum por QR Code) ---
ZAPI_INSTANCE=000000000000000
ZAPI_TOKEN=SEU_TOKEN
# ZAPI_CLIENT_TOKEN=SEU_CLIENT_TOKEN

# --- WhatsApp Cloud API (Meta oficial) ---
# WHATSAPP_TOKEN=EAAG...token-do-app-meta
# WHATSAPP_PHONE_ID=000000000000000

# --- Evolution API (open source, auto-hospedada) ---
# EVOLUTION_URL=https://evolution.suaescola.com.br
# EVOLUTION_API_KEY=SUA_API_KEY
# EVOLUTION_INSTANCE=escola

# --- Twilio WhatsApp ---
# TWILIO_ACCOUNT_SID=AC...
# TWILIO_AUTH_TOKEN=...
# TWILIO_WHATSAPP_FROM=+14155238886

# --- Comportamento do disparo automático ---
WHATSAPP_AUTO_CONVITE=true     # convite sai sozinho ao agendar
WHATSAPP_AUTO_ALTERACAO=true   # avisa alterações após o convite
WHATSAPP_JANELA_MINUTOS=180    # tolerância após o início do compromisso
CRON_SECRET=TROQUE_POR_UM_SEGREDO_LONGO  # protege a rota do agendador`}
              />
            </div>
            <ol className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-600">
              <li>
                <strong className="font-semibold text-slate-800">1.</strong> Com as credenciais
                configuradas, o sistema passa a enviar <strong>sozinho</strong>: convite ao agendar,
                lembrete do despertador na antecedência definida e aviso de alteração após edição.
              </li>
              <li>
                <strong className="font-semibold text-slate-800">2.</strong> Agende a rota{" "}
                <code>/api/whatsapp/automatico</code> em um cron a cada 5 minutos (cron-job.org,
                Google Cloud Scheduler, GitHub Actions, Vercel Cron ou{" "}
                <code>pg_cron</code> do Supabase) protegendo com <code>CRON_SECRET</code>.
              </li>
              <li>
                <strong className="font-semibold text-slate-800">3.</strong> Teste na página{" "}
                <strong>Mensagens WhatsApp</strong> com “Enviar mensagem de teste” e acompanhe a fila
                de lembretes e o resultado de cada disparo.
              </li>
              <li>
                <strong className="font-semibold text-slate-800">4.</strong> Sem provedor, o sistema
                segue funcionando pelo link direto do WhatsApp (com o texto pronto), registrando todo
                o histórico de comunicações.
              </li>
              <li>
                <strong className="font-semibold text-slate-800">5.</strong> A Meta exige{" "}
                <em>template aprovado</em> para mensagens iniciadas pela escola fora da janela de 24
                h; Z-API e Evolution não têm essa exigência.
              </li>
            </ol>

            <div className="mt-4">
              <CopyBlock
                titulo="agendamento por pg_cron no Supabase (opcional)"
                linhas={14}
                conteudo={`-- Habilite as extensões no Supabase (Database → Extensions)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Dispara a agenda a cada 5 minutos
select cron.schedule(
  'agenda-whatsapp-disparo',
  '*/5 * * * *',
  $$
    select net.http_get(
      url := 'https://SEU_DOMINIO/api/whatsapp/automatico?somente=todos&secret=SEU_CRON_SECRET'
    );
  $$
);

-- Para remover: select cron.unschedule('agenda-whatsapp-disparo');`}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Manutenção e conferência de dados</h2>
            <p className="mt-1 text-xs text-slate-600">
              Scripts prontos para o SQL Editor. Apagar registros é uma ação irreversível — use
              somente em caso de reinício da base.
            </p>
            <div className="mt-3">
              <CopyBlock titulo="verificação e limpeza" conteudo={MANUTENCAO_SQL} linhas={12} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Resumo de prontidão para uso oficial</h2>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <span>{estado.conectado ? "✅" : "⚠️"}</span> Conexão com o banco de dados
              </li>
              <li className="flex items-center gap-2">
                <span>{estado.schemaPronto ? "✅" : "⚠️"}</span> Tabelas da agenda criadas
              </li>
              <li className="flex items-center gap-2">
                <span>{baseLimpa ? "✅" : "⚠️"}</span> Base sem dados de demonstração
              </li>
              <li className="flex items-center gap-2">
                <span>{estado.contagens.gestores > 0 ? "✅" : "⬜"}</span> Equipe de gestão cadastrada
                {" "}({estado.contagens.gestores})
              </li>
              <li className="flex items-center gap-2">
                <span>{estado.contagens.compromissos > 0 ? "✅" : "⬜"}</span> Agenda em uso
                {" "}({estado.contagens.compromissos} compromisso(s))
              </li>
              <li className="flex items-center gap-2">
                <span>{estado.contagens.tokens > 0 ? "✅" : "⬜"}</span> Chaves de consulta externa
                {" "}({estado.contagens.tokens})
              </li>
              <li className="flex items-center gap-2">
                <span>{estado.contagens.mensagens > 0 ? "✅" : "⬜"}</span> Mensagens de WhatsApp
                registradas{" "}({estado.contagens.mensagens})
              </li>
            </ul>
            <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
              {ESCOLA.usoExclusivo}. Após configurar o Supabase e cadastrar a equipe, o sistema está
              apto a operar oficialmente.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
