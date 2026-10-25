import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseConfig,
  MISSING_SUPABASE_CONFIG_MESSAGE,
} from "@/lib/supabase/config";

/**
 * Aggiorna la sessione Supabase su ogni richiesta. Da richiamare dal middleware Next.js.
 * Restituisce la NextResponse con i cookie sincronizzati e l'utente corrente.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Senza configurazione niente sessione: le pagine mostreranno il messaggio esplicito.
  const config = getSupabaseConfig();
  if (!config) {
    console.error(`[Sessione] ${MISSING_SUPABASE_CONFIG_MESSAGE}`);
    return { response, user: null };
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

  return { response, user };
}
