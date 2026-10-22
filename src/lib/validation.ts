import { z } from "zod";
import {
  CARGO_KEYS,
  PRIORIDADE_KEYS,
  STATUS_KEYS,
  TIPO_KEYS,
  TURNO_KEYS,
} from "./constants";

const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
export const horaSchema = z
  .string()
  .trim()
  .regex(horaRegex, "Informe a hora no formato HH:MM");

const dataRegex = /^\d{4}-\d{2}-\d{2}$/;
export const dataSchema = z
  .string()
  .trim()
  .regex(dataRegex, "Informe a data no formato AAAA-MM-DD");

export const compromissoSchema = z
  .object({
    titulo: z.string().trim().min(3, "Informe um título com pelo menos 3 caracteres").max(160),
    tipo: z.enum(TIPO_KEYS),
    assunto: z.string().trim().min(3, "Descreva o assunto").max(240),
    descricao: z.string().trim().max(2000).optional().or(z.literal("")),
    cargoResponsavel: z.enum(CARGO_KEYS),
    gestorId: z.coerce.number().int().positive().nullable().optional(),
    dataInicio: dataSchema,
    dataFim: dataSchema,
    horaInicio: horaSchema,
    horaFim: horaSchema,
    local: z.string().trim().min(2, "Informe o local").max(160),
    participantes: z.string().trim().max(600).optional().or(z.literal("")),
    prioridade: z.enum(PRIORIDADE_KEYS).default("NORMAL"),
    status: z.enum(STATUS_KEYS).default("AGENDADO"),
    lembreteMinutos: z.coerce.number().int().min(0).max(10080).default(30),
    despertadorAtivo: z.coerce.boolean().default(true),
    /** Professores convocados para o compromisso (agenda do professor). */
    professorIds: z.array(z.coerce.number().int().positive()).max(200).optional(),
  })
  .refine((d) => d.dataFim >= d.dataInicio, {
    message: "A data final não pode ser anterior à data inicial",
    path: ["dataFim"],
  })
  .refine((d) => d.dataInicio !== d.dataFim || d.horaFim > d.horaInicio, {
    message: "A hora final deve ser posterior à hora inicial",
    path: ["horaFim"],
  });

export type CompromissoInput = z.output<typeof compromissoSchema>;

export const gestorSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo").max(140),
  cargo: z.enum(CARGO_KEYS),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().trim().max(40).optional().or(z.literal("")),
  escola: z.string().trim().max(160).optional().or(z.literal("")),
  ativo: z.coerce.boolean().default(true),
});

export type GestorInput = z.output<typeof gestorSchema>;

export const professorSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo do professor").max(140),
  disciplina: z.string().trim().max(120).optional().or(z.literal("")),
  turmas: z.string().trim().max(200).optional().or(z.literal("")),
  turno: z.enum(TURNO_KEYS).default("MANHA"),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().trim().max(40).optional().or(z.literal("")),
  observacoes: z.string().trim().max(600).optional().or(z.literal("")),
  ativo: z.coerce.boolean().default(true),
});

export type ProfessorInput = z.output<typeof professorSchema>;

export const tokenSchema = z.object({
  nome: z.string().trim().min(3, "Informe a identificação da integração").max(120),
  orgao: z.string().trim().max(160).optional().or(z.literal("")),
});

export type TokenInput = z.output<typeof tokenSchema>;

export const statusUpdateSchema = z.object({
  status: z.enum(STATUS_KEYS),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos";
}

export function normalizeOptional(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
