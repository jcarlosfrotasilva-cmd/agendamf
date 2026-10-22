/**
 * Identidade institucional do sistema.
 * Uso exclusivo da EE PROFA. MARLENE FRATTINI.
 * Pode ser sobrescrita por variáveis de ambiente sem alterar o código.
 */
export const ESCOLA = {
  nome: process.env.NEXT_PUBLIC_ESCOLA_NOME ?? "EE PROFA. MARLENE FRATTINI",
  nomeCompleto:
    process.env.NEXT_PUBLIC_ESCOLA_NOME_COMPLETO ??
    "Escola Estadual Professora Marlene Frattini",
  sigla: process.env.NEXT_PUBLIC_ESCOLA_SIGLA ?? "EE PMF",
  diretoria: process.env.NEXT_PUBLIC_DIRETORIA ?? "Diretoria de Ensino — Regional",
  sistema: "Agenda de Compromissos da Gestão Escolar",
  usoExclusivo: "Uso exclusivo da equipe de gestão da EE PROFA. MARLENE FRATTINI",
} as const;

export const BANCO = {
  provedor: "Supabase (PostgreSQL)",
  projeto: process.env.NEXT_PUBLIC_SUPABASE_PROJETO ?? "supabase",
} as const;
