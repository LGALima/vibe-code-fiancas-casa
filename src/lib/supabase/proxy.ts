import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

/** Rotas acessíveis sem login. */
const ROTAS_PUBLICAS = ["/login", "/auth"];

function ehRotaPublica(pathname: string) {
  return ROTAS_PUBLICAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );
}

/**
 * Renova a sessão do Supabase a cada requisição e redireciona para /login
 * quem não estiver autenticado.
 */
export async function updateSession(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Não coloque código entre createServerClient e getClaims: é aqui que o
  // token é validado e, se preciso, renovado.
  const { data } = await supabase.auth.getClaims();
  const usuarioLogado = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;

  if (!usuarioLogado && !ehRotaPublica(pathname)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    if (pathname !== "/") {
      destino.searchParams.set("next", `${pathname}${search}`);
    }
    return redirecionarMantendoCookies(destino, response);
  }

  if (usuarioLogado && pathname === "/login") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return redirecionarMantendoCookies(destino, response);
  }

  return response;
}

function redirecionarMantendoCookies(destino: URL, origem: NextResponse) {
  const redirect = NextResponse.redirect(destino);
  origem.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  // Cabeçalhos anti-cache que o Supabase pede quando grava cookies de sessão.
  ["cache-control", "expires", "pragma"].forEach((nome) => {
    const valor = origem.headers.get(nome);
    if (valor) redirect.headers.set(nome, valor);
  });
  return redirect;
}
