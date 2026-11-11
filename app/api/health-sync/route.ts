import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { normalizeSyncPayload } from "@/lib/hub/health-sync";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 6 * 1024 * 1024;
const BATCH = 2000;

/**
 * Ingresso della sincronizzazione dall'iPhone (Health Auto Export o Comando
 * Rapido). La chiave arriva solo nell'intestazione "Authorization: Bearer …",
 * mai nell'indirizzo, e viene verificata dal database: qui non c'è nessuna
 * chiave di amministrazione. Nei log non finisce mai il contenuto ricevuto.
 */
export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.json({ ok: false, error: "Servizio non configurato." }, { status: 503 });

  const token = request.headers.get("authorization")?.match(/^Bearer\s+([A-Za-z0-9_-]{32,200})$/)?.[1];
  if (!token) return NextResponse.json({ ok: false, error: "Chiave mancante." }, { status: 401 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: "Richiesta troppo grande: attiva l'invio a gruppi." }, { status: 413 });

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: "Richiesta troppo grande: attiva l'invio a gruppi." }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "Contenuto non valido." }, { status: 400 });
  }

  const rows = normalizeSyncPayload(body);
  if (rows.length === 0) return NextResponse.json({ ok: true, received: 0, saved: 0 });

  const supabase = createClient(config.url, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let saved = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { data, error } = await supabase.rpc("health_ingest", { p_token: token, p_rows: rows.slice(i, i + BATCH) });
    if (error) {
      const unauthorized = error.code === "28000";
      if (!unauthorized) console.error(`[Sincronizzazione salute] Errore (${error.code ?? "n/d"})`);
      return NextResponse.json({ ok: false, error: unauthorized ? "Chiave non valida." : "Salvataggio non riuscito." }, { status: unauthorized ? 401 : 500 });
    }
    saved += Number(data ?? 0);
  }
  return NextResponse.json({ ok: true, received: rows.length, saved });
}
