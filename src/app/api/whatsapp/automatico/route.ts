import type { NextRequest } from "next/server";
import { corsJson, json, baseUrlFrom } from "@/lib/api";
import { descricaoProvedorAtivo, provedorAtivo } from "@/lib/whatsapp";
import { executarDisparoAutomatico } from "@/lib/whatsapp-disparo";

export const dynamic = "force-dynamic";

/**
 * DISPARO AUTOMÁTICO DE WHATSAPP (execução no servidor)
 *
 * Agende esta rota em um cron externo para a agenda disparar sozinha:
 *   • cron-job.org / Google Cloud Scheduler / GitHub Actions / Vercel Cron
 *   • Supabase: pg_cron + pg_net chamando a URL a cada 5 minutos
 *
 * Exemplos:
 *   GET  /api/whatsapp/automatico?secret=SEU_SEGREDO
 *   POST /api/whatsapp/automatico?secret=SEU_SEGREDO&somente=lembretes
 *   GET  /api/whatsapp/automatico?secret=SEU_SEGREDO&simulacao=true  (não envia, só relata)
 *
 * Variável CRON_SECRET: quando definida, exige ?secret= (ou headers
 * x-cron-secret / Authorization: Bearer). Chamadas internas da interface
 * (same-origin) continuam liberadas.
 */
function autorizado(request: NextRequest): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return true;

  const url = new URL(request.url);
  const porQuery = url.searchParams.get("secret");
  const porHeader = request.headers.get("x-cron-secret");
  const auth = request.headers.get("authorization");
  const porBearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;

  if (porQuery === segredo || porHeader === segredo || porBearer === segredo) return true;

  // Chamada feita pela própria interface (botão "Executar disparo agora")
  const origem = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
  const host = request.headers.get("host") ?? "";
  const mesmaOrigem =
    host.length > 0 &&
    (origem.includes(host) || request.headers.get("x-interno") === "1");
  return mesmaOrigem;
}

async function executar(request: NextRequest) {
  if (!autorizado(request)) {
    return json(
      { ok: false, error: "Não autorizado. Informe ?secret=CRON_SECRET na chamada do agendador." },
      { status: 401 },
    );
  }

  const params = new URL(request.url).searchParams;
  const somenteParam = params.get("somente");
  const somente =
    somenteParam === "convites" || somenteParam === "lembretes" ? somenteParam : "todos";
  const origem = params.get("origem") ?? (request.headers.get("x-cron-secret") ? "cron" : "interface");

  try {
    const resultado = await executarDisparoAutomatico({
      origem,
      simulacao: params.get("simulacao") === "true",
      somente,
      baseUrl: baseUrlFrom(request),
    });

    return json({
      ok: true,
      provedorAtivo: provedorAtivo(),
      provedorDescricao: descricaoProvedorAtivo(),
      ...resultado,
    });
  } catch (error) {
    console.error("POST /api/whatsapp/automatico", error);
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Falha no disparo automático.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const resposta = await executar(request);
  // Permite monitoramento externo com CORS (o segredo continua obrigatório).
  const corpo = await resposta.clone().json();
  return corsJson(corpo, { status: resposta.status });
}

export async function POST(request: NextRequest) {
  return executar(request);
}
