import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACCESS_DENIED_PARAM, isEmailAllowed } from "@/lib/auth/allowlist";

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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    // Account non autorizzato: la sessione appena creata viene chiusa subito.
    if (!error && !isEmailAllowed(data.user?.email)) {
      await supabase.auth.signOut({ scope: "local" });
      const denied = new URL("/login", origin);
      denied.searchParams.set("errore", ACCESS_DENIED_PARAM);
      return NextResponse.redirect(denied);
    }
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
