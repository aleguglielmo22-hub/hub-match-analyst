"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MEALS } from "@/lib/hub/registry";
import { hubClient, logSafeError, requireOwner } from "@/lib/hub/server";

/* ------------------------------------------------------------------ */
/* Open Food Facts (database libero, nessuna chiave)                   */
/* ------------------------------------------------------------------ */

// Nome generico dell'app, senza dati personali (come chiede Open Food Facts).
const OFF_HEADERS = { "User-Agent": "AGWorkspace/1.0 (app personale)", Accept: "application/json" };
const OFF_FIELDS = "code,product_name,product_name_it,brands,nutriments,serving_quantity";

export type OffProduct = {
  code: string;
  nome: string;
  marca: string | null;
  kcal: number;
  proteine: number;
  carboidrati: number;
  grassi: number;
  porzione_g: number | null;
};

function num(v: unknown, max: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, Math.round(n * 100) / 100);
}

function toProduct(p: Record<string, unknown>): OffProduct | null {
  const code = typeof p.code === "string" && /^[0-9A-Za-z]{1,32}$/.test(p.code) ? p.code : null;
  const nome = String(p.product_name_it || p.product_name || "").trim().slice(0, 200);
  const n = (p.nutriments ?? {}) as Record<string, unknown>;
  if (!code || !nome || n["energy-kcal_100g"] === undefined) return null;
  const serving = num(p.serving_quantity, 5000);
  return {
    code,
    nome,
    marca: String(p.brands ?? "").split(",")[0].trim().slice(0, 200) || null,
    kcal: num(n["energy-kcal_100g"], 900),
    proteine: num(n.proteins_100g, 100),
    carboidrati: num(n.carbohydrates_100g, 100),
    grassi: num(n.fat_100g, 100),
    porzione_g: serving >= 1 ? serving : null,
  };
}

async function offFetch(url: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(url, { headers: OFF_HEADERS, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (res.status === 429 || res.status === 503) throw new Error("rate-limit");
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

/** Cerca per nome o per codice a barre. Va citata la fonte (licenza ODbL). */
export async function searchOpenFoodFacts(
  query: string,
): Promise<{ ok: true; products: OffProduct[] } | { ok: false; message: string }> {
  try {
    const q = z.string().trim().min(2).max(80).parse(query);
    await requireOwner();
    if (/^\d{8,14}$/.test(q)) {
      const data = await offFetch(`https://world.openfoodfacts.org/api/v2/product/${q}.json?fields=${OFF_FIELDS}`);
      const p = data?.product ? toProduct(data.product as Record<string, unknown>) : null;
      return { ok: true, products: p ? [p] : [] };
    }
    const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
    url.search = new URLSearchParams({
      search_terms: q,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "15",
      lc: "it",
      fields: OFF_FIELDS,
    }).toString();
    const data = await offFetch(url.toString());
    const products = ((data?.products as Record<string, unknown>[] | undefined) ?? [])
      .map(toProduct)
      .filter((p): p is OffProduct => !!p);
    return { ok: true, products };
  } catch (err) {
    if (err instanceof Error && err.message === "rate-limit") {
      return { ok: false, message: "Open Food Facts è occupato: riprova tra un minuto." };
    }
    logSafeError("Open Food Facts", err);
    return { ok: false, message: "Ricerca non riuscita. Riprova tra poco." };
  }
}

/** Salva tra i tuoi alimenti un prodotto di Open Food Facts (riletto dal server). */
export async function addOffFood(code: string): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  try {
    const c = z.string().regex(/^[0-9A-Za-z]{1,32}$/).parse(code);
    const workspace = await requireOwner();
    const data = await offFetch(`https://world.openfoodfacts.org/api/v2/product/${c}.json?fields=${OFF_FIELDS}`);
    const p = data?.product ? toProduct(data.product as Record<string, unknown>) : null;
    if (!p) return { ok: false, message: "Prodotto non trovato o senza valori nutrizionali." };
    const supabase = await hubClient();
    const { data: existing } = await supabase
      .from("nut_foods")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("barcode", p.code)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing) return { ok: true, id: (existing as { id: string }).id };
    const { data: row, error } = await supabase
      .from("nut_foods")
      .insert({
        workspace_id: workspace.id,
        nome: p.nome,
        marca: p.marca,
        kcal: p.kcal,
        proteine: p.proteine,
        carboidrati: p.carboidrati,
        grassi: p.grassi,
        porzione_g: p.porzione_g,
        barcode: p.code,
        fonte: "openfoodfacts",
      })
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/benessere", "layout");
    return { ok: true, id: (row as { id: string }).id };
  } catch (err) {
    if (err instanceof Error && err.message === "rate-limit") {
      return { ok: false, message: "Open Food Facts è occupato: riprova tra un minuto." };
    }
    logSafeError("Alimento da Open Food Facts", err);
    return { ok: false, message: "Non è stato possibile salvare l'alimento." };
  }
}

/* ------------------------------------------------------------------ */
/* Diario dei pasti                                                    */
/* ------------------------------------------------------------------ */

const entrySchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pasto: z.enum(MEALS.map((m) => m.value) as [string, ...string[]]),
  food_id: z.string().uuid(),
  grammi: z.number().positive().max(5000),
});

/** Aggiunge un alimento al diario: calorie e macro calcolati dai valori per 100 g. */
export async function addLogEntry(input: unknown): Promise<{ ok: boolean; message?: string }> {
  try {
    const e = entrySchema.parse(input);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data: food, error } = await supabase
      .from("nut_foods")
      .select("id, nome, kcal, proteine, carboidrati, grassi")
      .eq("id", e.food_id)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!food) return { ok: false, message: "Alimento non trovato." };
    const f = food as { nome: string; kcal: number; proteine: number; carboidrati: number; grassi: number };
    const k = e.grammi / 100;
    const r2 = (n: number) => Math.round(Number(n) * k * 100) / 100;
    const { error: insErr } = await supabase.from("nut_log").insert({
      workspace_id: workspace.id,
      data: e.data,
      pasto: e.pasto,
      food_id: e.food_id,
      nome: f.nome,
      grammi: e.grammi,
      kcal: r2(f.kcal),
      proteine: r2(f.proteine),
      carboidrati: r2(f.carboidrati),
      grassi: r2(f.grassi),
    });
    if (insErr) throw insErr;
    revalidatePath("/benessere", "layout");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    logSafeError("Diario pasti", err);
    return { ok: false, message: "Non è stato possibile aggiungere l'alimento." };
  }
}

export async function deleteLogEntry(id: string): Promise<{ ok: boolean }> {
  try {
    const v = z.string().uuid().parse(id);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { error } = await supabase.from("nut_log").delete().eq("id", v).eq("workspace_id", workspace.id);
    if (error) throw error;
    revalidatePath("/benessere", "layout");
    return { ok: true };
  } catch (err) {
    logSafeError("Diario pasti", err);
    return { ok: false };
  }
}

const goalSchema = z.object({
  kcal: z.number().int().min(500).max(10000).nullable(),
  proteine: z.number().int().min(0).max(1000).nullable(),
  carboidrati: z.number().int().min(0).max(2000).nullable(),
  grassi: z.number().int().min(0).max(1000).nullable(),
});

export async function saveNutritionGoals(input: unknown): Promise<{ ok: boolean; message?: string }> {
  try {
    const g = goalSchema.parse(input);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { error } = await supabase.from("nut_goals").upsert({ workspace_id: workspace.id, ...g }, { onConflict: "workspace_id" });
    if (error) throw error;
    revalidatePath("/benessere", "layout");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    logSafeError("Obiettivi nutrizionali", err);
    return { ok: false, message: "Valori non validi: calorie tra 500 e 10000, macro in grammi." };
  }
}
