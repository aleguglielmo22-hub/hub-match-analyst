"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { METRIC_TYPES } from "@/lib/hub/registry";
import { hubClient, logSafeError, requireOwner } from "@/lib/hub/server";

const MAX_ROWS = 5000;
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const metricSchema = z.object({
  data: dateSchema,
  tipo: z.enum(METRIC_TYPES.map((t) => t.value) as [string, ...string[]]),
  valore: z.number().finite().min(0).max(1_000_000),
});

export type ImportResult = { ok: true; inserted: number; updated: number; skipped: number } | { ok: false; message: string };

/**
 * Parametri vitali da file: un valore per parametro e giorno. Se il giorno
 * c'è già, il valore viene aggiornato (le misure a mano restano a mano).
 */
export async function importMetrics(input: unknown): Promise<ImportResult> {
  try {
    const rows = z.array(metricSchema).max(MAX_ROWS).parse(input);
    if (rows.length === 0) return { ok: true, inserted: 0, updated: 0, skipped: 0 };
    const workspace = await requireOwner();
    const supabase = await hubClient();

    const dates = rows.map((r) => r.data).sort();
    const { data: existing, error } = await supabase
      .from("health_metrics")
      .select("id, tipo, data, fonte")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .gte("data", dates[0])
      .lte("data", dates[dates.length - 1])
      .limit(20000);
    if (error) throw error;
    const byKey = new Map(
      ((existing ?? []) as { id: string; tipo: string; data: string; fonte: string }[]).map((e) => [`${e.tipo}|${e.data}`, e]),
    );

    const toInsert: Record<string, unknown>[] = [];
    let updated = 0;
    let skipped = 0;
    const seen = new Set<string>();
    for (const r of rows) {
      const key = `${r.tipo}|${r.data}`;
      if (seen.has(key)) {
        skipped++;
        continue;
      }
      seen.add(key);
      const old = byKey.get(key);
      if (old) {
        if (old.fonte === "manuale") {
          skipped++;
          continue;
        }
        const { error: uErr } = await supabase
          .from("health_metrics")
          .update({ valore: r.valore })
          .eq("id", old.id)
          .eq("workspace_id", workspace.id);
        if (uErr) throw uErr;
        updated++;
      } else {
        toInsert.push({ workspace_id: workspace.id, data: r.data, tipo: r.tipo, valore: r.valore, fonte: "import" });
      }
    }
    for (let i = 0; i < toInsert.length; i += 500) {
      const { error: iErr } = await supabase.from("health_metrics").insert(toInsert.slice(i, i + 500));
      if (iErr) throw iErr;
    }
    revalidatePath("/benessere", "layout");
    return { ok: true, inserted: toInsert.length, updated, skipped };
  } catch (err) {
    logSafeError("Importazione parametri", err);
    return { ok: false, message: "Importazione non riuscita. Controlla le colonne scelte e riprova." };
  }
}

const txSchema = z.object({
  data: dateSchema,
  descrizione: z.string().trim().min(1).max(300),
  /** Positivo = entrata, negativo = uscita, in centesimi. */
  importo_cent: z.number().int().refine((n) => n !== 0 && Math.abs(n) < 100_000_000_000),
});

/**
 * Movimenti da estratto conto CSV. Ogni riga ha un'impronta (data, importo,
 * descrizione e ripetizione nel file): reimportare lo stesso file non crea doppioni.
 */
export async function importTransactions(input: unknown, contoId: unknown): Promise<ImportResult> {
  try {
    const rows = z.array(txSchema).max(MAX_ROWS).parse(input);
    const conto = z.union([z.string().uuid(), z.literal(""), z.null()]).parse(contoId ?? null) || null;
    if (rows.length === 0) return { ok: true, inserted: 0, updated: 0, skipped: 0 };
    const workspace = await requireOwner();
    const supabase = await hubClient();

    const occurrences = new Map<string, number>();
    const records = rows.map((r) => {
      const base = `${conto ?? ""}|${r.data}|${r.importo_cent}|${r.descrizione.toLowerCase()}`;
      const n = (occurrences.get(base) ?? 0) + 1;
      occurrences.set(base, n);
      return {
        workspace_id: workspace.id,
        data: r.data,
        tipo: r.importo_cent > 0 ? "entrata" : "uscita",
        importo_cent: Math.abs(r.importo_cent),
        descrizione: r.descrizione,
        conto_id: conto,
        import_hash: createHash("sha256").update(`${base}|${n}`).digest("hex"),
      };
    });

    let inserted = 0;
    for (let i = 0; i < records.length; i += 500) {
      const { data, error } = await supabase
        .from("fin_transactions")
        .upsert(records.slice(i, i + 500), { onConflict: "workspace_id,import_hash", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      inserted += data?.length ?? 0;
    }
    revalidatePath("/finanze", "layout");
    revalidatePath("/dashboard");
    return { ok: true, inserted, updated: 0, skipped: records.length - inserted };
  } catch (err) {
    logSafeError("Importazione movimenti", err);
    return { ok: false, message: "Importazione non riuscita. Controlla le colonne scelte e riprova." };
  }
}
