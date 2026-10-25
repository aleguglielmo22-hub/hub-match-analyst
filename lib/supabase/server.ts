import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";
import { requireSupabaseConfig } from "@/lib/supabase/config";

/**
 * Client Supabase per Server Components, Route Handlers e Server Actions.
 * Legge/scrive i cookie di sessione gestiti da @supabase/ssr.
 */
export async function createClient() {
  // Prima i cookie (rende la pagina dinamica), poi il controllo configurazione:
  // così il messaggio di configurazione mancante compare a runtime, non in build.
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabaseConfig();

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chiamato da un Server Component: il refresh sessione lo fa il middleware.
          }
        },
      },
    },
  );
}
