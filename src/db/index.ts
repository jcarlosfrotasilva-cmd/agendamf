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
const databaseUrl =
  process.env.SUPABASE_DB_URL ??
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
  const usaPooler = url.includes(":6543");

  return {
    connectionString: url,
    // Supabase e demais provedores gerenciados exigem TLS.
    ssl: remoto ? { rejectUnauthorized: false } : undefined,
    // O pooler do Supabase (porta 6543) não suporta prepared statements nomeados.
    max: Number(process.env.PGPOOL_MAX ?? (usaPooler ? 5 : 10)),
    applicationName: "agenda-gestao-escolar",
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT ?? 15000),
  };
}

const globalForDb = globalThis as typeof globalThis & {
  __agendaEscolarPool?: Pool;
};

export const pool = globalForDb.__agendaEscolarPool ?? new Pool(buildConfig(databaseUrl));

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
