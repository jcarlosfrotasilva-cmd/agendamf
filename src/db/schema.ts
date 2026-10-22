import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * BANCO DE DADOS INTERNO (PostgreSQL)
 * -----------------------------------
 * Tabelas responsáveis por armazenar a agenda de compromissos da gestão escolar.
 * A consulta externa online é servida pela API pública (/api/public/v1/*) que
 * lê exatamente destas tabelas em modo somente-leitura.
 */

export const gestores = pgTable(
  "gestores",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    cargo: text("cargo").notNull(),
    email: text("email"),
    telefone: text("telefone"),
    escola: text("escola"),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("gestores_cargo_idx").on(table.cargo)],
);

export const compromissos = pgTable(
  "compromissos",
  {
    id: serial("id").primaryKey(),
    titulo: text("titulo").notNull(),
    tipo: text("tipo").notNull().default("ORIENTACAO_PEDAGOGICA"),
    assunto: text("assunto").notNull(),
    descricao: text("descricao"),
    cargoResponsavel: text("cargo_responsavel").notNull(),
    gestorId: integer("gestor_id").references(() => gestores.id, {
      onDelete: "set null",
    }),
    dataInicio: date("data_inicio").notNull(),
    dataFim: date("data_fim").notNull(),
    horaInicio: text("hora_inicio").notNull(),
    horaFim: text("hora_fim").notNull(),
    local: text("local").notNull(),
    participantes: text("participantes"),
    prioridade: text("prioridade").notNull().default("NORMAL"),
    status: text("status").notNull().default("AGENDADO"),
    lembreteMinutos: integer("lembrete_minutos").notNull().default(30),
    despertadorAtivo: boolean("despertador_ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("compromissos_data_idx").on(table.dataInicio),
    index("compromissos_cargo_idx").on(table.cargoResponsavel),
    index("compromissos_local_idx").on(table.local),
    index("compromissos_status_idx").on(table.status),
  ],
);

export const auditoria = pgTable("auditoria", {
  id: serial("id").primaryKey(),
  entidade: text("entidade").notNull(),
  entidadeId: integer("entidade_id"),
  acao: text("acao").notNull(),
  detalhe: text("detalhe").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Usuários do sistema (equipe de gestão). Perfis de acesso:
 *  ADMIN   — acesso total, inclusive gestão de usuários
 *  GESTAO  — agenda completa: cria, edita, convoca e dá baixa
 *  LEITURA — consulta a agenda, sem editar
 */
export const usuarios = pgTable(
  "usuarios",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    email: text("email").notNull().unique(),
    senhaHash: text("senha_hash").notNull(),
    papel: text("papel").notNull().default("GESTAO"),
    cargo: text("cargo"),
    ativo: boolean("ativo").notNull().default(true),
    ultimoAcesso: timestamp("ultimo_acesso", { withTimezone: true }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("usuarios_email_idx").on(table.email)],
);

/** Corpo docente: cada professor tem sua própria agenda de compromissos. */
export const professores = pgTable(
  "professores",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    disciplina: text("disciplina"),
    turmas: text("turmas"),
    turno: text("turno").notNull().default("MANHA"),
    email: text("email"),
    telefone: text("telefone"),
    observacoes: text("observacoes"),
    /** Código do link pessoal de acesso do professor (somente leitura). */
    tokenAcesso: text("token_acesso").unique(),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("professores_nome_idx").on(table.nome),
    index("professores_turno_idx").on(table.turno),
  ],
);

/** Convocações: quais professores estão envolvidos em cada compromisso. */
export const compromissoProfessores = pgTable(
  "compromisso_professores",
  {
    id: serial("id").primaryKey(),
    compromissoId: integer("compromisso_id")
      .notNull()
      .references(() => compromissos.id, { onDelete: "cascade" }),
    professorId: integer("professor_id")
      .notNull()
      .references(() => professores.id, { onDelete: "cascade" }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("compromisso_professores_compromisso_idx").on(table.compromissoId),
    index("compromisso_professores_professor_idx").on(table.professorId),
  ],
);

/**
 * Registro das comunicações por WhatsApp (convites, lembretes do despertador,
 * alterações e cancelamentos) enviadas ao responsável de cada compromisso.
 */
export const mensagensWhatsapp = pgTable(
  "mensagens_whatsapp",
  {
    id: serial("id").primaryKey(),
    compromissoId: integer("compromisso_id")
      .notNull()
      .references(() => compromissos.id, { onDelete: "cascade" }),
    gestorId: integer("gestor_id").references(() => gestores.id, {
      onDelete: "set null",
    }),
    professorId: integer("professor_id").references(() => professores.id, {
      onDelete: "set null",
    }),
    destinoNome: text("destino_nome").notNull(),
    destinoTelefone: text("destino_telefone").notNull(),
    finalidade: text("finalidade").notNull().default("CONVITE"),
    mensagem: text("mensagem").notNull(),
    canal: text("canal").notNull().default("LINK"),
    status: text("status").notNull().default("GERADO"),
    erro: text("erro"),
    enviadoEm: timestamp("enviado_em", { withTimezone: true }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("mensagens_whatsapp_compromisso_idx").on(table.compromissoId),
    index("mensagens_whatsapp_criado_idx").on(table.criadoEm),
  ],
);

/** Chaves para acesso externo com detalhamento completo da agenda. */
export const apiTokens = pgTable("api_tokens", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  orgao: text("orgao"),
  token: text("token").notNull().unique(),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Gestor = typeof gestores.$inferSelect;
export type NovoGestor = typeof gestores.$inferInsert;
export type Compromisso = typeof compromissos.$inferSelect;
export type NovoCompromisso = typeof compromissos.$inferInsert;
export type RegistroAuditoria = typeof auditoria.$inferSelect;
export type ApiToken = typeof apiTokens.$inferSelect;
export type MensagemWhatsapp = typeof mensagensWhatsapp.$inferSelect;
export type NovaMensagemWhatsapp = typeof mensagensWhatsapp.$inferInsert;
export type Professor = typeof professores.$inferSelect;
export type NovoProfessor = typeof professores.$inferInsert;
export type Usuario = typeof usuarios.$inferSelect;
export type NovoUsuario = typeof usuarios.$inferInsert;
export type ConvocaProfessor = typeof compromissoProfessores.$inferSelect;
