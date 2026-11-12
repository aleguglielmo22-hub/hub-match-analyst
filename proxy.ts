import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ACCESS_DENIED_PARAM } from "@/lib/auth/allowlist";
import { DEFAULT_AFTER_LOGIN } from "@/lib/auth/next-path";

/**
 * Rotte protette: l'utente deve essere autenticato per accedervi.
 * Tutte le sezioni di app/(app)/ vivono sotto questi prefissi.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/scouting",
  "/set-pieces",
  "/situational",
  "/archivio",
  "/cestino",
  "/impostazioni",
];

const isProtected = (pathname: string) =>
  PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Rotte solo-anonimo: se sei già loggato vieni rimbalzato sulla dashboard.
 */
const ANON_ONLY_PATHS = ["/login"];

/** Keep-alive: deve restare com'è, senza controllo dell'account. */
const KEEP_ALIVE_PATH = "/api/keep-alive";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user, denied } = await updateSession(request, {
    enforceAllowlist: pathname !== KEEP_ALIVE_PATH,
  });

  // Account non autorizzato: sessione già chiusa, nessuna pagina/azione eseguita.
  // Si torna al login con il messaggio, portando i cookie di logout.
  if (denied) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("errore", ACCESS_DENIED_PARAM);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  // Loggato che torna sul login → vai alla dashboard.
  if (user && ANON_ONLY_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_AFTER_LOGIN;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Anonimo che apre una rotta protetta → forza login, ricordando dove voleva
  // andare (filtri compresi).
  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Escludi asset statici, immagini, favicon e file della PWA dal refresh sessione.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
