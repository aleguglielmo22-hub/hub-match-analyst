import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Rotte protette: l'utente deve essere autenticato per accedervi.
 * Tutto ciò che sta dentro app/(app)/ vive sotto questi prefissi.
 */
const PROTECTED_PREFIXES = ["/archivio", "/impostazioni"];

/**
 * Rotte solo-anonimo: se sei già loggato vieni rimbalzato su /archivio.
 */
const ANON_ONLY_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Loggato che torna sul login → vai all'archivio.
  if (user && ANON_ONLY_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/archivio";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Anonimo che apre una rotta protetta → forza login, ricordando dove voleva andare.
  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Escludi asset statici, immagini e favicon dal refresh sessione.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
