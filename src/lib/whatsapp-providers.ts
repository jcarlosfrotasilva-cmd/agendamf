import {
  normalizarTelefone,
  provedorAtivo,
  type ProvedorKey,
  type ResultadoEnvioWhatsApp,
} from "./whatsapp";

const TIMEOUT_MS = 20000;

function semPrefixo(telefone: string): string {
  return telefone.replace(/^\+/, "");
}

async function enviarMeta(telefone: string, mensagem: string): Promise<ResultadoEnvioWhatsApp> {
  const token = process.env.WHATSAPP_TOKEN as string;
  const phoneId = process.env.WHATSAPP_PHONE_ID as string;

  const resposta = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: telefone,
      type: "text",
      text: { preview_url: false, body: mensagem },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const dados = (await resposta.json()) as {
    messages?: { id: string }[];
    error?: { message?: string };
  };

  if (!resposta.ok) {
    const detalhe = dados.error?.message ?? `HTTP ${resposta.status}`;
    const dica =
      resposta.status === 400
        ? " (verifique se o número tem WhatsApp e se há template aprovado para mensagens iniciadas pela escola)"
        : "";
    return { enviado: false, canal: "API", provedor: "meta", erro: `${detalhe}${dica}` };
  }

  return {
    enviado: true,
    canal: "API",
    provedor: "meta",
    idMensagem: dados.messages?.[0]?.id,
  };
}

async function enviarZapi(telefone: string, mensagem: string): Promise<ResultadoEnvioWhatsApp> {
  const instance = process.env.ZAPI_INSTANCE as string;
  const token = process.env.ZAPI_TOKEN as string;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  const resposta = await fetch(
    `https://api.z-api.io/instances/${instance}/token/${token}/send-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(clientToken ? { "Client-Token": clientToken } : {}),
      },
      body: JSON.stringify({ phone: semPrefixo(telefone), message: mensagem }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );

  const dados = (await resposta.json().catch(() => ({}))) as {
    messageId?: string;
    id?: string;
    error?: string;
    message?: string;
  };

  if (!resposta.ok) {
    return {
      enviado: false,
      canal: "API",
      provedor: "zapi",
      erro: dados.error ?? dados.message ?? `Falha no envio via Z-API (HTTP ${resposta.status}).`,
    };
  }

  return {
    enviado: true,
    canal: "API",
    provedor: "zapi",
    idMensagem: dados.messageId ?? dados.id,
  };
}

async function enviarEvolution(
  telefone: string,
  mensagem: string,
): Promise<ResultadoEnvioWhatsApp> {
  const base = (process.env.EVOLUTION_URL as string).replace(/\/+$/, "");
  const apikey = process.env.EVOLUTION_API_KEY as string;
  const instance = process.env.EVOLUTION_INSTANCE as string;

  const resposta = await fetch(`${base}/message/sendText/${instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey },
    body: JSON.stringify({ number: telefone, text: mensagem }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const dados = (await resposta.json().catch(() => ({}))) as {
    key?: { id?: string };
    message?: string;
    error?: string;
  };

  if (!resposta.ok) {
    return {
      enviado: false,
      canal: "API",
      provedor: "evolution",
      erro:
        dados.message ??
        dados.error ??
        `Falha no envio via Evolution API (HTTP ${resposta.status}).`,
    };
  }

  return { enviado: true, canal: "API", provedor: "evolution", idMensagem: dados.key?.id };
}

async function enviarTwilio(telefone: string, mensagem: string): Promise<ResultadoEnvioWhatsApp> {
  const sid = process.env.TWILIO_ACCOUNT_SID as string;
  const token = process.env.TWILIO_AUTH_TOKEN as string;
  const from = process.env.TWILIO_WHATSAPP_FROM as string;

  const corpo = new URLSearchParams({
    From: from.startsWith("whatsapp:") ? from : `whatsapp:+${semPrefixo(from)}`,
    To: `whatsapp:+${semPrefixo(telefone)}`,
    Body: mensagem,
  });

  const resposta = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: corpo.toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );

  const dados = (await resposta.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
    error_message?: string;
  };

  if (!resposta.ok) {
    return {
      enviado: false,
      canal: "API",
      provedor: "twilio",
      erro:
        dados.message ??
        dados.error_message ??
        `Falha no envio via Twilio (HTTP ${resposta.status}).`,
    };
  }

  return { enviado: true, canal: "API", provedor: "twilio", idMensagem: dados.sid };
}

/**
 * Envia a mensagem por um provedor de API do WhatsApp.
 * Sem credenciais configuradas, retorna canal LINK (envio manual pelo wa.me).
 */
export async function enviarPorProvedor(
  telefone: string,
  mensagem: string,
  provedorForcado?: ProvedorKey | null,
): Promise<ResultadoEnvioWhatsApp> {
  const provedor = provedorForcado ?? provedorAtivo();
  if (!provedor) {
    return { enviado: false, canal: "LINK", provedor: "nenhum" };
  }

  const numero = normalizarTelefone(telefone);
  if (!numero) {
    return {
      enviado: false,
      canal: "API",
      provedor,
      erro: "Telefone inválido para envio automático.",
    };
  }

  try {
    switch (provedor) {
      case "meta":
        return await enviarMeta(numero, mensagem);
      case "zapi":
        return await enviarZapi(numero, mensagem);
      case "evolution":
        return await enviarEvolution(numero, mensagem);
      case "twilio":
        return await enviarTwilio(numero, mensagem);
    }
  } catch (error) {
    return {
      enviado: false,
      canal: "API",
      provedor,
      erro:
        error instanceof Error
          ? `${error.name === "TimeoutError" ? "Tempo esgotado ao contactar o provedor: " : ""}${error.message}`
          : "Falha de comunicação com o provedor de WhatsApp.",
    };
  }
}
