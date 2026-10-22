import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, verificarTokenSessao } from "@/lib/auth-edge";

/**
 * CONTROLE DE ACESSO
 *  • Área da gestão (todas as páginas e APIs internas): exige login.
 *  • Consulta externa (/api/public/*), saúde (/api/health), login (/entrar,
 *    /api/auth/*) e o link pessoal do professor (/professor/<token>): liberados.
 */
const PUBLICAS = [
  "/entrar",
  "/api/auth",
  "/api/health",
  "/api/public",
  "/professor/",
  "/favicon.ico",
];

function ehPublica(pathname: string): boolean {
  if (pathname === "/") return false;
  return PUBLICAS.some((prefixo) => pathname === prefixo || pathname.startsWith(prefixo));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (ehPublica(pathname)) {
    // Usuário já autenticado que abre a tela de login vai direto ao painel.
    if (pathname === "/entrar") {
      const sessao = await verificarTokenSessao(request.cookies.get(COOKIE_SESSAO)?.value);
      if (sessao) return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const sessao = await verificarTokenSessao(request.cookies.get(COOKIE_SESSAO)?.value);

  if (!sessao) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Sessão expirada ou inexistente. Faça login na área da gestão para continuar.",
        },
        { status: 401 },
      );
    }
    const destino = new URL("/entrar", request.url);
    destino.searchParams.set("proximo", `${pathname}${search}`);
    return NextResponse.redirect(destino);
  }

  const resposta = NextResponse.next();
  resposta.headers.set("x-usuario-papel", sessao.papel);
  resposta.headers.set("x-usuario-nome", encodeURIComponent(sessao.nome));
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|css|js|woff2?)$).*)"],
};
