import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

/**
 * Configuração de produção (Supabase) — carregada de config/producao.json.
 *
 * A plataforma de hospedagem gerencia os arquivos .env/.env.local e pode
 * reescrevê-los entre implantações. Para que as credenciais sobrevivam,
 * elas ficam neste arquivo próprio e são injetadas no ambiente do build.
 */
function configuracaoDeProducao(): Record<string, string> {
  try {
    const bruto = readFileSync(join(process.cwd(), "config", "producao.json"), "utf8");
    const dados = JSON.parse(bruto) as Record<string, string>;
    delete dados._comentario;
    return dados;
  } catch {
    return {};
  }
}

const producao = configuracaoDeProducao();

// Variáveis de ambiente do processo têm prioridade; o arquivo cobre o caso de
// a plataforma limpar os .env.
for (const [chave, valor] of Object.entries(producao)) {
  if (!process.env[chave]) process.env[chave] = valor;
}

const nextConfig: NextConfig = {
  // SESSION_SECRET precisa estar disponível também no Edge (middleware).
  env: {
    SESSION_SECRET: process.env.SESSION_SECRET ?? producao.SESSION_SECRET ?? "",
    NEXT_PUBLIC_ESCOLA_NOME:
      process.env.NEXT_PUBLIC_ESCOLA_NOME ?? producao.NEXT_PUBLIC_ESCOLA_NOME ?? "EE PROFA. MARLENE FRATTINI",
  },
  serverExternalPackages: ["pg"],
};

export default nextConfig;
