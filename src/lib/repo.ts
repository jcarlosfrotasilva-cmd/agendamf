import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  apiTokens,
  auditoria,
  compromissoProfessores,
  compromissos,
  gestores,
  mensagensWhatsapp,
  professores,
  type Compromisso,
  type Gestor,
  type Professor,
} from "@/db/schema";
import { isoToday, rangeForPeriodo } from "./datetime";

export type CompromissoComGestor = Compromisso & {
  gestorNome: string | null;
  gestorCargo: string | null;
  gestorTelefone: string | null;
};

export type Filtros = {
  de?: string;
  ate?: string;
  periodo?: string;
  cargo?: string;
  tipo?: string;
  status?: string;
  local?: string;
  busca?: string;
  gestorId?: number;
  /** Filtra pela agenda de um professor específico (convocações). */
  professorId?: number;
  incluirCancelados?: boolean;
  ordenar?: "DATA" | "CARGO" | "LOCAL" | "TITULO";
  limite?: number;
  /** Considera compromissos que atravessam o intervalo informado (data fim >= de). */
  sobrepor?: boolean;
};

function buildWhere(filtros: Filtros) {
  const condicoes = [];

  if (filtros.periodo) {
    const range = rangeForPeriodo(filtros.periodo);
    condicoes.push(gte(compromissos.dataInicio, range.de));
    condicoes.push(lte(compromissos.dataInicio, range.ate));
  } else if (filtros.de || filtros.ate) {
    if (filtros.sobrepor && filtros.de && filtros.ate) {
      // compromissos que ocupam qualquer dia do intervalo (mesmo iniciados antes)
      condicoes.push(gte(compromissos.dataFim, filtros.de));
      condicoes.push(lte(compromissos.dataInicio, filtros.ate));
    } else {
      if (filtros.de) condicoes.push(gte(compromissos.dataInicio, filtros.de));
      if (filtros.ate) condicoes.push(lte(compromissos.dataInicio, filtros.ate));
    }
  }

  if (filtros.cargo) condicoes.push(eq(compromissos.cargoResponsavel, filtros.cargo));
  if (filtros.professorId) {
    condicoes.push(
      inArray(
        compromissos.id,
        db
          .select({ id: compromissoProfessores.compromissoId })
          .from(compromissoProfessores)
          .where(eq(compromissoProfessores.professorId, filtros.professorId)),
      ),
    );
  }
  if (filtros.tipo) condicoes.push(eq(compromissos.tipo, filtros.tipo));
  if (filtros.local) condicoes.push(eq(compromissos.local, filtros.local));
  if (filtros.gestorId) condicoes.push(eq(compromissos.gestorId, filtros.gestorId));
  if (filtros.status) {
    condicoes.push(eq(compromissos.status, filtros.status));
  } else if (filtros.incluirCancelados === false) {
    condicoes.push(sql`${compromissos.status} <> 'CANCELADO'`);
  }

  const busca = filtros.busca?.trim();
  if (busca) {
    const termo = `%${busca}%`;
    const procura = or(
      ilike(compromissos.titulo, termo),
      ilike(compromissos.assunto, termo),
      ilike(compromissos.local, termo),
      ilike(compromissos.participantes, termo),
      ilike(compromissos.descricao, termo),
    );
    if (procura) condicoes.push(procura);
  }

  return condicoes.length > 0 ? and(...condicoes) : undefined;
}

function orderBy(ordenar: Filtros["ordenar"]) {
  switch (ordenar) {
    case "CARGO":
      return [asc(compromissos.cargoResponsavel), asc(compromissos.dataInicio), asc(compromissos.horaInicio)];
    case "LOCAL":
      return [asc(compromissos.local), asc(compromissos.dataInicio), asc(compromissos.horaInicio)];
    case "TITULO":
      return [asc(compromissos.titulo)];
    default:
      return [asc(compromissos.dataInicio), asc(compromissos.horaInicio), asc(compromissos.id)];
  }
}

export async function listarCompromissos(filtros: Filtros = {}): Promise<CompromissoComGestor[]> {
  const rows = await db
    .select({
      compromisso: compromissos,
      gestorNome: gestores.nome,
      gestorCargo: gestores.cargo,
      gestorTelefone: gestores.telefone,
    })
    .from(compromissos)
    .leftJoin(gestores, eq(compromissos.gestorId, gestores.id))
    .where(buildWhere(filtros))
    .orderBy(...orderBy(filtros.ordenar))
    .limit(filtros.limite ?? 500);

  return rows.map((r) => ({
    ...r.compromisso,
    gestorNome: r.gestorNome ?? null,
    gestorCargo: r.gestorCargo ?? null,
    gestorTelefone: r.gestorTelefone ?? null,
  }));
}

export async function obterCompromisso(id: number): Promise<CompromissoComGestor | null> {
  const rows = await db
    .select({
      compromisso: compromissos,
      gestorNome: gestores.nome,
      gestorCargo: gestores.cargo,
      gestorTelefone: gestores.telefone,
    })
    .from(compromissos)
    .leftJoin(gestores, eq(compromissos.gestorId, gestores.id))
    .where(eq(compromissos.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    ...row.compromisso,
    gestorNome: row.gestorNome ?? null,
    gestorCargo: row.gestorCargo ?? null,
    gestorTelefone: row.gestorTelefone ?? null,
  };
}

export async function listarMensagens(filtros: {
  compromissoId?: number;
  status?: string;
  finalidade?: string;
  limite?: number;
} = {}) {
  const condicoes = [];
  if (filtros.compromissoId) {
    condicoes.push(eq(mensagensWhatsapp.compromissoId, filtros.compromissoId));
  }
  if (filtros.status) condicoes.push(eq(mensagensWhatsapp.status, filtros.status));
  if (filtros.finalidade) condicoes.push(eq(mensagensWhatsapp.finalidade, filtros.finalidade));

  return db
    .select()
    .from(mensagensWhatsapp)
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(desc(mensagensWhatsapp.criadoEm))
    .limit(filtros.limite ?? 60);
}

export async function obterMensagem(id: number) {
  const rows = await db
    .select()
    .from(mensagensWhatsapp)
    .where(eq(mensagensWhatsapp.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Lembretes que ainda vão disparar (despertador ativo e sem lembrete enviado). */
export async function listarLembretesPendentes(limite = 20) {
  const hoje = isoToday();
  const linhas = await db
    .select({
      id: compromissos.id,
      titulo: compromissos.titulo,
      dataInicio: compromissos.dataInicio,
      dataFim: compromissos.dataFim,
      horaInicio: compromissos.horaInicio,
      horaFim: compromissos.horaFim,
      lembreteMinutos: compromissos.lembreteMinutos,
      status: compromissos.status,
      cargoResponsavel: compromissos.cargoResponsavel,
      local: compromissos.local,
      gestorNome: gestores.nome,
      gestorTelefone: gestores.telefone,
      jaEnviado: sql<number>`(
        select count(*)::int from ${mensagensWhatsapp} m
        where m.compromisso_id = ${compromissos.id}
          and m.finalidade = 'LEMBRETE'
          and m.status = 'ENVIADO'
      )`,
    })
    .from(compromissos)
    .leftJoin(gestores, eq(compromissos.gestorId, gestores.id))
    .where(
      and(
        eq(compromissos.despertadorAtivo, true),
        inArray(compromissos.status, ["AGENDADO", "CONFIRMADO", "EM_ANDAMENTO", "ADIADO"]),
        gte(compromissos.dataFim, hoje),
      ),
    )
    .orderBy(asc(compromissos.dataInicio), asc(compromissos.horaInicio))
    .limit(80);

  return linhas.filter((l) => l.jaEnviado === 0).slice(0, limite);
}

export async function resumoMensagens() {
  const [linha] = await db
    .select({
      total: sql<number>`count(*)::int`,
      enviadas: sql<number>`count(*) filter (where ${mensagensWhatsapp.status} = 'ENVIADO')::int`,
      geradas: sql<number>`count(*) filter (where ${mensagensWhatsapp.status} = 'GERADO')::int`,
      falhas: sql<number>`count(*) filter (where ${mensagensWhatsapp.status} = 'FALHA')::int`,
      canceladas: sql<number>`count(*) filter (where ${mensagensWhatsapp.status} = 'CANCELADO')::int`,
      hoje: sql<number>`count(*) filter (where ${mensagensWhatsapp.criadoEm}::date = current_date)::int`,
      automaticas: sql<number>`count(*) filter (where ${mensagensWhatsapp.canal} = 'API')::int`,
    })
    .from(mensagensWhatsapp);
  return {
    total: linha?.total ?? 0,
    enviadas: linha?.enviadas ?? 0,
    geradas: linha?.geradas ?? 0,
    falhas: linha?.falhas ?? 0,
    canceladas: linha?.canceladas ?? 0,
    hoje: linha?.hoje ?? 0,
    automaticas: linha?.automaticas ?? 0,
  };
}

export type Contagem = { chave: string; total: number };

export async function contarPor(coluna: "cargo_responsavel" | "local" | "tipo" | "status") {
  const col =
    coluna === "cargo_responsavel"
      ? compromissos.cargoResponsavel
      : coluna === "local"
        ? compromissos.local
        : coluna === "tipo"
          ? compromissos.tipo
          : compromissos.status;
  const rows = await db
    .select({ chave: col, total: sql<number>`count(*)::int` })
    .from(compromissos)
    .groupBy(col)
    .orderBy(desc(sql`count(*)`));
  return rows as Contagem[];
}

export type Resumo = {
  total: number;
  hoje: number;
  semana: number;
  proximos7: number;
  mes: number;
  atrasados: number;
  realizadosMes: number;
  cancelados: number;
  proximo: CompromissoComGestor | null;
  porCargo: Contagem[];
  porLocal: Contagem[];
  porTipo: Contagem[];
  porStatus: Contagem[];
};

export async function obterResumo(): Promise<Resumo> {
  const hoje = isoToday();
  const semana = rangeForPeriodo("SEMANA", hoje);
  const inicio = semana.de;
  const fim = semana.ate;
  const mes = rangeForPeriodo("MES", hoje);

  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      hoje: sql<number>`count(*) filter (where ${compromissos.dataInicio} <= ${hoje} and ${compromissos.dataFim} >= ${hoje})::int`,
      semana: sql<number>`count(*) filter (where ${compromissos.dataInicio} between ${inicio} and ${fim})::int`,
      proximos7: sql<number>`count(*) filter (where ${compromissos.dataInicio} between ${hoje} and ${sql`(${hoje}::date + interval '7 days')`})::int`,
      mes: sql<number>`count(*) filter (where ${compromissos.dataInicio} between ${mes.de} and ${mes.ate})::int`,
      atrasados: sql<number>`count(*) filter (where ${compromissos.status} in ('AGENDADO','CONFIRMADO','EM_ANDAMENTO') and ${compromissos.dataFim} < ${hoje})::int`,
      realizadosMes: sql<number>`count(*) filter (where ${compromissos.status} = 'REALIZADO' and ${compromissos.dataInicio} between ${mes.de} and ${mes.ate})::int`,
      cancelados: sql<number>`count(*) filter (where ${compromissos.status} = 'CANCELADO')::int`,
    })
    .from(compromissos);

  const proximoRows = await db
    .select({
      compromisso: compromissos,
      gestorNome: gestores.nome,
      gestorCargo: gestores.cargo,
      gestorTelefone: gestores.telefone,
    })
    .from(compromissos)
    .leftJoin(gestores, eq(compromissos.gestorId, gestores.id))
    .where(
      and(
        gte(compromissos.dataFim, hoje),
        inArray(compromissos.status, ["AGENDADO", "CONFIRMADO", "EM_ANDAMENTO"]),
      ),
    )
    .orderBy(asc(compromissos.dataInicio), asc(compromissos.horaInicio))
    .limit(1);

  const [porCargo, porLocal, porTipo, porStatus] = await Promise.all([
    contarPor("cargo_responsavel"),
    contarPor("local"),
    contarPor("tipo"),
    contarPor("status"),
  ]);

  return {
    total: counts?.total ?? 0,
    hoje: counts?.hoje ?? 0,
    semana: counts?.semana ?? 0,
    proximos7: counts?.proximos7 ?? 0,
    mes: counts?.mes ?? 0,
    atrasados: counts?.atrasados ?? 0,
    realizadosMes: counts?.realizadosMes ?? 0,
    cancelados: counts?.cancelados ?? 0,
    proximo: proximoRows[0]
      ? {
          ...proximoRows[0].compromisso,
          gestorNome: proximoRows[0].gestorNome ?? null,
          gestorCargo: proximoRows[0].gestorCargo ?? null,
          gestorTelefone: proximoRows[0].gestorTelefone ?? null,
        }
      : null,
    porCargo,
    porLocal,
    porTipo,
    porStatus,
  };
}

export type ProfessorComTotal = Professor & { totalCompromissos: number };

export async function listarProfessores(filtros: { turno?: string; ativo?: boolean } = {}) {
  const condicoes = [];
  if (filtros.turno) condicoes.push(eq(professores.turno, filtros.turno));
  if (filtros.ativo !== undefined) condicoes.push(eq(professores.ativo, filtros.ativo));

  const rows = await db
    .select({
      professor: professores,
      total: sql<number>`count(${compromissoProfessores.id})::int`,
    })
    .from(professores)
    .leftJoin(compromissoProfessores, eq(compromissoProfessores.professorId, professores.id))
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .groupBy(professores.id)
    .orderBy(asc(professores.turno), asc(professores.nome));

  return rows.map((r) => ({ ...r.professor, totalCompromissos: r.total }));
}

export async function obterProfessor(id: number): Promise<ProfessorComTotal | null> {
  const rows = await db
    .select({
      professor: professores,
      total: sql<number>`count(${compromissoProfessores.id})::int`,
    })
    .from(professores)
    .leftJoin(compromissoProfessores, eq(compromissoProfessores.professorId, professores.id))
    .where(eq(professores.id, id))
    .groupBy(professores.id)
    .limit(1);

  const row = rows[0];
  return row ? { ...row.professor, totalCompromissos: row.total } : null;
}

export async function listarProfessoresDoCompromisso(compromissoId: number) {
  const rows = await db
    .select({ professor: professores })
    .from(compromissoProfessores)
    .innerJoin(professores, eq(compromissoProfessores.professorId, professores.id))
    .where(eq(compromissoProfessores.compromissoId, compromissoId))
    .orderBy(asc(professores.nome));
  return rows.map((r) => r.professor);
}

export async function idsProfessoresDoCompromisso(compromissoId: number) {
  const rows = await db
    .select({ professorId: compromissoProfessores.professorId })
    .from(compromissoProfessores)
    .where(eq(compromissoProfessores.compromissoId, compromissoId));
  return rows.map((r) => r.professorId);
}

/** Sincroniza as convocações de professores de um compromisso. */
export async function definirProfessoresDoCompromisso(
  compromissoId: number,
  professorIds: number[],
) {
  const atuais = await idsProfessoresDoCompromisso(compromissoId);
  const desejados = Array.from(new Set(professorIds));
  const adicionar = desejados.filter((id) => !atuais.includes(id));
  const remover = atuais.filter((id) => !desejados.includes(id));

  if (adicionar.length > 0) {
    await db
      .insert(compromissoProfessores)
      .values(adicionar.map((professorId) => ({ compromissoId, professorId })));
  }
  if (remover.length > 0) {
    await db
      .delete(compromissoProfessores)
      .where(
        and(
          eq(compromissoProfessores.compromissoId, compromissoId),
          inArray(compromissoProfessores.professorId, remover),
        ),
      );
  }

  return { adicionados: adicionar.length, removidos: remover.length };
}

export async function resumoProfessores() {
  const [linha] = await db
    .select({
      total: sql<number>`count(*)::int`,
      ativos: sql<number>`count(*) filter (where ${professores.ativo})::int`,
      comCompromissos: sql<number>`(
        select count(distinct cp.professor_id)::int from compromisso_professores cp
      )`,
      convocacoes: sql<number>`(select count(*)::int from compromisso_professores)`,
      disciplinas: sql<number>`count(distinct nullif(${professores.disciplina}, ''))::int`,
    })
    .from(professores);

  return {
    total: linha?.total ?? 0,
    ativos: linha?.ativos ?? 0,
    comCompromissos: linha?.comCompromissos ?? 0,
    convocacoes: linha?.convocacoes ?? 0,
    disciplinas: linha?.disciplinas ?? 0,
  };
}

export async function listarGestores(): Promise<(Gestor & { totalCompromissos: number })[]> {
  const rows = await db
    .select({
      gestor: gestores,
      total: sql<number>`count(${compromissos.id})::int`,
    })
    .from(gestores)
    .leftJoin(compromissos, eq(compromissos.gestorId, gestores.id))
    .groupBy(gestores.id)
    .orderBy(asc(gestores.cargo), asc(gestores.nome));

  return rows.map((r) => ({ ...r.gestor, totalCompromissos: r.total }));
}

export async function registrarAuditoria(entrada: {
  entidade: string;
  entidadeId?: number | null;
  acao: string;
  detalhe: string;
}) {
  await db.insert(auditoria).values({
    entidade: entrada.entidade,
    entidadeId: entrada.entidadeId ?? null,
    acao: entrada.acao,
    detalhe: entrada.detalhe,
  });
}

export async function listarAuditoria(limite = 12) {
  return db.select().from(auditoria).orderBy(desc(auditoria.criadoEm)).limit(limite);
}

export async function listarTokens() {
  return db.select().from(apiTokens).orderBy(desc(apiTokens.criadoEm));
}

export async function validarToken(token: string | null | undefined) {
  if (!token) return null;
  const rows = await db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.token, token), eq(apiTokens.ativo, true)))
    .limit(1);
  return rows[0] ?? null;
}
