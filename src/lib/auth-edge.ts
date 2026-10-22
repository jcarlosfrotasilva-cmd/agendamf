/**
 * Verificação do token de sessão compatível com Edge Runtime (middleware).
 * A assinatura é HMAC-SHA256 sobre o payload em base64url.
 */

export type PayloadSessao = {
  uid: number;
  nome: string;
  email: string;
  papel: "ADMIN" | "GESTAO" | "LEITURA";
  exp: number;
};

export const COOKIE_SESSAO = "age_sessao";

export function segredoDeAssinatura(): string {
  return (
    process.env.SESSION_SECRET ??
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    "agenda-escolar-marlene-frattini"
  );
}

function base64UrlFromBytes(bytes: Uint8Array): string {
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesFromBase64Url(valor: string): Uint8Array {
  const normalizado = valor.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalizado.length % 4 === 0 ? "" : "=".repeat(4 - (normalizado.length % 4));
  const binario = atob(normalizado + padding);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function chave(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(segredoDeAssinatura()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function assinarPayload(payload: PayloadSessao): Promise<string> {
  const corpo = base64UrlFromBytes(new TextEncoder().encode(JSON.stringify(payload)));
  const assinatura = await crypto.subtle.sign("HMAC", await chave(), new TextEncoder().encode(corpo));
  return `${corpo}.${base64UrlFromBytes(new Uint8Array(assinatura))}`;
}

export async function verificarTokenSessao(
  token: string | undefined | null,
): Promise<PayloadSessao | null> {
  if (!token || !token.includes(".")) return null;
  const [corpo, assinatura] = token.split(".");
  if (!corpo || !assinatura) return null;

  try {
    const assinaturaBytes = bytesFromBase64Url(assinatura);
    const bufferAssinatura = new ArrayBuffer(assinaturaBytes.length);
    new Uint8Array(bufferAssinatura).set(assinaturaBytes);

    const valido = await crypto.subtle.verify(
      "HMAC",
      await chave(),
      bufferAssinatura,
      new TextEncoder().encode(corpo),
    );
    if (!valido) return null;

    const payload = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(corpo))) as PayloadSessao;
    if (!payload?.uid || !payload.exp) return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
