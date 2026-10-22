"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  description: string;
  /** Perfis que enxergam o item. Ausente = todos. */
  papeis?: ("ADMIN" | "GESTAO" | "LEITURA")[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Painel da Gestão", icon: "◧", description: "Visão geral e indicadores" },
  { href: "/agenda", label: "Agenda", icon: "▤", description: "Compromissos por data, cargo e local" },
  { href: "/compromissos/novo", label: "Novo Compromisso", icon: "＋", description: "Agendar orientação ou reunião" },
  { href: "/gestores", label: "Gestores / Cargos", icon: "⚑", description: "Equipe de gestão escolar" },
  { href: "/professores", label: "Professores", icon: "👩‍🏫", description: "Corpo docente e agenda de cada professor" },
  { href: "/locais", label: "Locais", icon: "⌂", description: "Espaços e salas utilizadas" },
  { href: "/mensagens", label: "Mensagens WhatsApp", icon: "💬", description: "Convites, lembretes e registros de envio" },
  { href: "/consulta", label: "Consulta Online", icon: "◎", description: "Banco externo para consulta" },
  { href: "/api-publica", label: "API Externa", icon: "⌗", description: "Integração com outras plataformas" },
  {
    href: "/usuarios",
    label: "Usuários e Acessos",
    icon: "🔐",
    description: "Quem entra no sistema e com qual perfil",
    papeis: ["ADMIN"],
  },
  {
    href: "/testes",
    label: "Testes do Sistema",
    icon: "⚗",
    description: "Smoke test e cenários de validação",
    papeis: ["ADMIN", "GESTAO"],
  },
  {
    href: "/configuracao",
    label: "Banco de Dados",
    icon: "⛁",
    description: "Supabase, estrutura e diagnóstico",
    papeis: ["ADMIN"],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({
  variant = "sidebar",
  papel,
}: {
  variant?: "sidebar" | "mobile";
  papel?: "ADMIN" | "GESTAO" | "LEITURA";
}) {
  const pathname = usePathname();
  const visiveis = NAV_ITEMS.filter(
    (item) => !item.papeis || !papel || item.papeis.includes(papel),
  );

  if (variant === "mobile") {
    return (
      <nav className="flex gap-1.5 overflow-x-auto pb-1">
        {visiveis.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <span aria-hidden className="text-sm leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-1">
      {visiveis.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              active
                ? "bg-white/12 text-white ring-1 ring-white/15"
                : "text-slate-300/90 hover:bg-white/8 hover:text-white"
            }`}
          >
            <span
              aria-hidden
              className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px] transition ${
                active ? "bg-white/20 text-white" : "bg-white/8 text-slate-300 group-hover:bg-white/15"
              }`}
            >
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold leading-tight">{item.label}</span>
              <span className="mt-0.5 block text-[11px] leading-tight text-slate-400 group-hover:text-slate-300">
                {item.description}
              </span>
            </span>
            {active ? (
              <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-gradient-to-b from-indigo-300 to-emerald-300" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
