import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback del magic link Supabase.
 * Scambia il `code` PKCE con una sessione e poi redirige all'URL `next`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/archivio";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // `next` può essere un path relativo (es. /archivio/123). Restiamo sul nostro origin.
      const safeNext = next.startsWith("/") ? next : "/archivio";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // Code mancante o invalido → torna al login con un flag d'errore.
  const url = new URL("/login", origin);
  url.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(url);
}
