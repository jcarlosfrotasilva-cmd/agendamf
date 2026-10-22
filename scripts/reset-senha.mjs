#!/usr/bin/env node
/**
 * RECUPERAÇÃO DE ACESSO — redefine a senha de um usuário diretamente no banco.
 * Use quando o administrador perder a senha e não houver outro admin ativo.
 *
 * Uso:
 *   node scripts/reset-senha.mjs --listar
 *   node scripts/reset-senha.mjs gestao@escola.edu.br "NovaSenha123"
 *   node scripts/reset-senha.mjs gestao@escola.edu.br "NovaSenha123" --promover
 *
 * --promover  também garante o perfil ADMIN e reativa o usuário.
 * Requer SUPABASE_DB_URL (ou DATABASE_URL) no ambiente / arquivo .env.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";

/**
 * Carrega .env.local (prioridade) e depois .env, sem sobrescrever variáveis
 * já presentes no ambiente. Assim o script usa o mesmo banco da aplicação.
 */
function carregarEnv() {
  for (const arquivo of ["../.env.local", "../.env"]) {
    try {
      const conteudo = readFileSync(new URL(arquivo, import.meta.url), "utf8");
      for (const linha of conteudo.split("\n")) {
        const limpa = linha.trim();
        if (!limpa || limpa.startsWith("#")) continue;
        const igual = limpa.indexOf("=");
        if (igual < 0) continue;
        const chave = limpa.slice(0, igual).trim();
        const valor = limpa.slice(igual + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[chave]) process.env[chave] = valor;
      }
    } catch {
      /* arquivo ausente: segue com o ambiente atual */
    }
  }
}

function gerarHashSenha(senha) {
  const salt = randomBytes(16).toString("hex");
  const derivado = scryptSync(senha, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivado}`;
}

function validar(senha) {
  if (senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (!/[A-Za-zÀ-ÿ]/.test(senha)) return "A senha precisa conter letras.";
  if (!/\d/.test(senha)) return "A senha precisa conter números.";
  return null;
}

async function main() {
  carregarEnv();
  const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("Configure SUPABASE_DB_URL (ou DATABASE_URL) antes de executar.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const remotos = !/localhost|127\.0\.0\.1/.test(url);
  const cliente = new Client({
    connectionString: url,
    ssl: remotos ? { rejectUnauthorized: false } : undefined,
  });
  await cliente.connect();

  try {
    if (args.includes("--listar") || args.length === 0) {
      const { rows } = await cliente.query(
        `select email, papel,
                case when ativo then 'ativo' else 'bloqueado' end as situacao,
                to_char(coalesce(ultimo_acesso, criado_em), 'DD/MM/YYYY HH24:MI') as referencia
           from usuarios order by papel, email`,
      );
      console.log(`\nBanco: ${url.replace(/:[^:@/]+@/, ":***@")}\n`);
    console.log("Usuários cadastrados:");
      for (const r of rows) {
        console.log(` • ${r.email}  [${r.papel} · ${r.situacao}]  último acesso: ${r.referencia}`);
      }
      console.log("\nPara redefinir: node scripts/reset-senha.mjs <email> <novaSenha> [--promover]\n");
      return;
    }

    const email = (args[0] ?? "").trim().toLowerCase();
    const senha = args[1] ?? "";
    const promover = args.includes("--promover");

    const problema = validar(senha);
    if (!email || !email.includes("@")) {
      console.error("Informe um e-mail válido. Ex.: node scripts/reset-senha.mjs gestao@escola.edu.br NovaSenha123");
      process.exit(1);
    }
    if (problema) {
      console.error(problema);
      process.exit(1);
    }

    const { rowCount } = await cliente.query(
      `update usuarios
          set senha_hash = $1
              ${promover ? ", papel = 'ADMIN', ativo = true" : ""}
        where lower(email) = $2`,
      [gerarHashSenha(senha), email],
    );

    if (rowCount === 0) {
      console.error(`Nenhum usuário encontrado com o e-mail ${email}.`);
      const { rows } = await cliente.query("select email from usuarios order by email");
      if (rows.length > 0) {
        console.log("E-mails disponíveis:");
        for (const r of rows) console.log(` • ${r.email}`);
      }
      process.exit(1);
    }

    await cliente.query(
      `insert into auditoria (entidade, acao, detalhe)
       values ('usuario', 'SENHA_REDEFINIDA', $1)`,
      [
        `Senha redefinida via script de recuperação para ${email}${
          promover ? " (perfil ADMIN, acesso reativado)" : ""
        }.`,
      ],
    );

    console.log(`\n✔ Senha redefinida para ${email}${promover ? " (ADMIN, reativado)" : ""}.`);
    console.log("  A senha não é exibida nem armazenada em texto: apenas o hash scrypt.\n");
  } finally {
    await cliente.end();
  }
}

main().catch((erro) => {
  console.error("Falha na recuperação:", erro.message);
  process.exit(1);
});
