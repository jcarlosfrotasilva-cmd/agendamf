import type { NextRequest } from "next/server";
import { CORS_HEADERS, baseUrlFrom, corsJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Contrato OpenAPI 3.0 da API pública da agenda (consulta externa online). */
export async function GET(request: NextRequest) {
  const base = baseUrlFrom(request);
  const paramsComuns = [
    { name: "de", in: "query", schema: { type: "string", format: "date" }, description: "Data inicial (AAAA-MM-DD)" },
    { name: "ate", in: "query", schema: { type: "string", format: "date" }, description: "Data final (AAAA-MM-DD)" },
    {
      name: "periodo",
      in: "query",
      schema: { type: "string", enum: ["HOJE", "SEMANA", "PROXIMOS7", "MES", "PASSADOS", "TODOS"] },
      description: "Atalho de período",
    },
    {
      name: "cargo",
      in: "query",
      schema: {
        type: "string",
        enum: ["DIRETOR", "VICE_DIRETOR", "COORDENADOR_PEDAGOGICO", "GERENTE_ORGANIZACAO"],
      },
      description: "Filtra por cargo da gestão",
    },
    { name: "tipo", in: "query", schema: { type: "string" }, description: "Tipo de compromisso" },
    { name: "local", in: "query", schema: { type: "string" }, description: "Local exato" },
    {
      name: "professorId",
      in: "query",
      schema: { type: "integer" },
      description: "Filtra pela agenda de um professor específico (convocações do docente)",
    },
    { name: "status", in: "query", schema: { type: "string" }, description: "Situação do compromisso" },
    { name: "busca", in: "query", schema: { type: "string" }, description: "Busca livre em título, assunto, local e participantes" },
    { name: "key", in: "query", schema: { type: "string" }, description: "Chave de integração para campos detalhados" },
  ];

  return corsJson({
    openapi: "3.0.3",
    info: {
      title: "API da Agenda da Gestão Escolar",
      version: "1.0.0",
      description:
        "Consulta externa online (somente leitura) da agenda de compromissos da gestão escolar: diretor, vice-diretor, coordenação pedagógica geral e gerência de organização escolar.",
    },
    servers: [{ url: base }],
    paths: {
      "/api/public/v1/agenda": {
        get: {
          summary: "Lista compromissos da agenda",
          parameters: [
            ...paramsComuns,
            { name: "formato", in: "query", schema: { type: "string", enum: ["json", "ics"] } },
            { name: "limite", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "Lista de compromissos em JSON (ou arquivo iCalendar)" } },
        },
      },
      "/api/public/v1/agenda.ics": {
        get: {
          summary: "Feed iCalendar para assinatura em Google Agenda / Outlook",
          parameters: paramsComuns,
          responses: { "200": { description: "Arquivo text/calendar" } },
        },
      },
      "/api/public/v1/resumo": {
        get: {
          summary: "Indicadores agregados por cargo, tipo, situação e local",
          responses: { "200": { description: "Resumo institucional" } },
        },
      },
    },
    "x-documentacao": `${base}/api-publica`,
  });
}
