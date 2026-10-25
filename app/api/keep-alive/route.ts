import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Keep-alive del progetto Supabase gratuito (pausa dopo 7 giorni di inattività).
 * Chiamata ogni giorno dal Cron Job di Vercel (vedi vercel.json).
 * Esegue un count head-only: genera una query reale sul DB senza trasferire dati.
 * Pubblica ma innocua: la risposta non contiene mai dati del database.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };

  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { error } = await supabase
      .from("players")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json(
      { ok: true, timestamp: new Date().toISOString() },
      { headers },
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500, headers });
  }
}
