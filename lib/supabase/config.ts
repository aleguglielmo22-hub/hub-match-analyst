/**
 * Configurazione Supabase dalle variabili d'ambiente pubbliche.
 * Se mancano, l'app mostra un messaggio esplicito invece di contattare "undefined".
 * NB: le NEXT_PUBLIC_* vanno lette per nome esteso (Next le incorpora nel bundle).
 */
export const MISSING_SUPABASE_CONFIG_MESSAGE =
  "Configurazione mancante: le variabili NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY non sono impostate, quindi l'app non può collegarsi al database. Vanno aggiunte nelle impostazioni del progetto su Vercel, seguite da un nuovo deploy.";

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function requireSupabaseConfig(): { url: string; anonKey: string } {
  const config = getSupabaseConfig();
  if (!config) throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
  return config;
}
