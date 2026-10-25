import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseConfig,
  MISSING_SUPABASE_CONFIG_MESSAGE,
} from "@/lib/supabase/config";
import { isEmailAllowed } from "@/lib/auth/allowlist";

/**
 * Aggiorna la sessione Supabase su ogni richiesta. Da richiamare dal middleware Next.js.
 * Restituisce la NextResponse con i cookie sincronizzati e l'utente corrente.
 * Con `enforceAllowlist`, un account non autorizzato viene disconnesso subito
 * (cookie di sessione cancellati) e segnalato con `denied: true`.
 */
export async function updateSession(
  request: NextRequest,
  { enforceAllowlist = true }: { enforceAllowlist?: boolean } = {},
): Promise<{ response: NextResponse; user: User | null; denied: boolean }> {
  let response = NextResponse.next({ request });

  // Senza configurazione niente sessione: le pagine mostreranno il messaggio esplicito.
  const config = getSupabaseConfig();
  if (!config) {
    console.error(`[Sessione] ${MISSING_SUPABASE_CONFIG_MESSAGE}`);
    return { response, user: null, denied: false };
  }

  const supabase = createServerClient(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && enforceAllowlist && !isEmailAllowed(user.email)) {
    console.warn(`[Accesso] Account non autorizzato disconnesso: ${user.id}`);
    // "local": chiude solo questa sessione (cookie cancellati), non gli altri dispositivi.
    await supabase.auth.signOut({ scope: "local" });
    return { response, user: null, denied: true };
  }

  return { response, user, denied: false };
}
