import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { requireSupabaseConfig } from "@/lib/supabase/config";

/**
 * Client Supabase per componenti client (browser).
 * Usa la chiave anonima — le RLS proteggono i dati.
 */
export function createClient() {
  const { url, anonKey } = requireSupabaseConfig();
  return createBrowserClient<Database>(url, anonKey);
}
