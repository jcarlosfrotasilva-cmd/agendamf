import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Conexão com o banco de dados.
 *
 * Em produção o sistema opera com o Supabase (PostgreSQL gerenciado).
 * Ordem de prioridade das variáveis de ambiente:
 *   1. SUPABASE_DB_URL  (connection string do Supabase)
 *   2. DATABASE_URL     (padrão, também aceita a string do Supabase)
 */
/**
 * Fallback persistente: lê config/producao.json quando a plataforma limpa os
 * arquivos .env. A ordem garante que o Supabase (produção) prevaleça sobre o
 * banco local usado apenas no bootstrap da plataforma.
 */
function urlDoArquivoDeProducao(): string | undefined {
  if (typeof process === "undefined" || !process.cwd) return undefined;
  try {
    const bruto = require("node:fs").readFileSync(
      require("node:path").join(process.cwd(), "config", "producao.json"),
      "utf8",
    ) as string;
    const dados = JSON.parse(bruto) as Record<string, string>;
    return dados.SUPABASE_DB_URL;
  } catch {
    return undefined;
  }
}

const databaseUrl =
  process.env.SUPABASE_DB_URL ??
  urlDoArquivoDeProducao() ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  "";

if (!databaseUrl) {
  throw new Error(
    "Configuração ausente: defina SUPABASE_DB_URL ou DATABASE_URL com a connection string do PostgreSQL (Supabase).",
  );
}

/** Detecta se o host é local (dispensa SSL) ou remoto, como o Supabase (exige SSL). */
function isLocalHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

function buildConfig(url: string) {
  const remoto = !isLocalHost(url);

  return {
    connectionString: url,
    // Supabase e demais provedores gerenciados exigem TLS.
    ssl: remoto ? { rejectUnauthorized: false } : undefined,
    /**
     * Orçamento de conexões: o pooler do Supabase limita 15 clientes por
     * projeto no modo sessão (5432). Mantemos no máximo 3 conexões por
     * instância e devolvemos as ociosas rapidamente; no modo transação (6543)
     * o multiplexador cuida do restante.
     */
    max: Number(process.env.PGPOOL_MAX ?? (remoto ? 3 : 10)),
    applicationName: "agenda-gestao-escolar",
    idleTimeoutMillis: Number(process.env.PGIDLE_TIMEOUT ?? 10000),
    connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT ?? 15000),
    allowExitOnIdle: true,
    keepAlive: true,
  };
}

const globalForDb = globalThis as typeof globalThis & {
  __agendaEscolarPool?: Pool;
};

export const pool = globalForDb.__agendaEscolarPool ?? new Pool(buildConfig(databaseUrl));

// Um erro em conexão ociosa não pode derrubar o processo: o pool descarta a
// conexão e a próxima consulta abre outra.
pool.on("error", (erro: Error) => {
  console.error("[db] erro em conexão ociosa do pool:", erro.message);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__agendaEscolarPool = pool;
}

export const db = drizzle(pool);

/** Host do banco em uso (sem credenciais), útil para diagnóstico. */
export function databaseHost(): string {
  try {
    const { hostname, port, pathname } = new URL(databaseUrl);
    return `${hostname}${port ? `:${port}` : ""}${pathname}`;
  } catch {
    return "indefinido";
  }
}

export function isSupabase(): boolean {
  try {
    return new URL(databaseUrl).hostname.includes("supabase");
  } catch {
    return false;
  }
}

export function isLocalDatabase(): boolean {
  return isLocalHost(databaseUrl);
}
