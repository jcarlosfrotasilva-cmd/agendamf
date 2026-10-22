import { sql } from "drizzle-orm";
import { db, databaseHost, isLocalDatabase, isSupabase } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Verificação de saúde do sistema: conexão com o banco (Supabase) e existência
 * das tabelas da agenda. Serve também para monitoramento externo.
 */
export async function GET() {
  const inicio = Date.now();
  try {
    await db.execute(sql`select 1`);

    const tabelas = await db.execute<{ tabela: string | null }>(sql`
      select to_regclass('public.compromissos')::text as tabela
    `);
    const schemaPronto = Boolean(tabelas.rows[0]?.tabela);

    let contagens = { compromissos: 0, gestores: 0, professores: 0, mensagens: 0 };
    if (schemaPronto) {
      const resultado = await db.execute<{
        compromissos: number;
        gestores: number;
        professores: number;
        mensagens: number;
      }>(sql`
        select
          (select count(*)::int from compromissos) as compromissos,
          (select count(*)::int from gestores) as gestores,
          (select count(*)::int from professores) as professores,
          (select count(*)::int from mensagens_whatsapp) as mensagens
      `);
      contagens = {
        compromissos: resultado.rows[0]?.compromissos ?? 0,
        gestores: resultado.rows[0]?.gestores ?? 0,
        professores: resultado.rows[0]?.professores ?? 0,
        mensagens: resultado.rows[0]?.mensagens ?? 0,
      };
    }

    return Response.json({
      ok: true,
      servico: "agenda-gestao-escolar",
      escola: process.env.NEXT_PUBLIC_ESCOLA_NOME ?? "EE PROFA. MARLENE FRATTINI",
      banco: {
        conectado: true,
        host: databaseHost(),
        provedor: isSupabase() ? "supabase" : isLocalDatabase() ? "local" : "postgres-externo",
        schemaPronto,
      },
      registros: contagens,
      seguranca: {
        loginObrigatorio: true,
        usuariosCadastrados: (await db.execute<{ total: number }>(sql`
          select count(*)::int as total from usuarios
        `)).rows[0]?.total ?? 0,
        provedorPublico: "consulta externa somente leitura (/api/public/v1/*)",
      },
      latenciaMs: Date.now() - inicio,
      verificadoEm: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        servico: "agenda-gestao-escolar",
        banco: { conectado: false, host: databaseHost() },
        erro: error instanceof Error ? error.message : "falha desconhecida",
        verificadoEm: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
