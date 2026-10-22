import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { UsuarioManager } from "@/components/UsuarioManager";
import { Card, StatCard } from "@/components/ui";
import { getSessao, podeAdministrar } from "@/lib/auth";
import { PAPEIS } from "@/lib/constants-acesso";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!podeAdministrar(sessao.papel)) redirect("/");

  const itens = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      papel: usuarios.papel,
      cargo: usuarios.cargo,
      ativo: usuarios.ativo,
      ultimoAcesso: usuarios.ultimoAcesso,
      criadoEm: usuarios.criadoEm,
    })
    .from(usuarios)
    .orderBy(asc(usuarios.nome));

  const ativos = itens.filter((u) => u.ativo).length;
  const administradores = itens.filter((u) => u.papel === "ADMIN" && u.ativo).length;
  const semAcesso = itens.filter((u) => !u.ultimoAcesso).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Segurança e acessos
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Usuários do sistema
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Defina quem entra na agenda da gestão e com qual perfil. Professores não usam login: cada
            um recebe um link pessoal de leitura da própria agenda.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/professores"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            Gerar links dos professores
          </Link>
          <Link
            href="/configuracao"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            Configuração do banco
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuários cadastrados" value={itens.length} icon="🔐" />
        <StatCard label="Com acesso ativo" value={ativos} accent="emerald" icon="✅" />
        <StatCard
          label="Administradores"
          value={administradores}
          accent="brand"
          hint="Necessário ao menos um ativo"
          icon="🛡️"
        />
        <StatCard
          label="Nunca acessaram"
          value={semAcesso}
          accent="amber"
          hint="Senha inicial ainda não utilizada"
          icon="🕓"
        />
      </div>

      <UsuarioManager
        usuarioAtualId={sessao.uid}
        usuarios={itens.map((u) => ({
          id: u.id,
          nome: u.nome,
          email: u.email,
          papel: u.papel,
          cargo: u.cargo,
          ativo: u.ativo,
          ultimoAcesso: u.ultimoAcesso ? u.ultimoAcesso.toISOString() : null,
          criadoEm: u.criadoEm.toISOString(),
        }))}
      />

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900">Perfis disponíveis</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {PAPEIS.map((papel) => (
            <div key={papel.key} className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${papel.chip}`}
              >
                {papel.label}
              </span>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{papel.descricao}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          Sessão de 12 horas, encerrada automaticamente. Toda entrada, tentativa de acesso indevida,
          envio de WhatsApp e alteração de agenda ficam registrados na trilha de auditoria do painel.
        </p>
      </Card>
    </div>
  );
}
