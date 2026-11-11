import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import type { Option } from "./fields";
import { COLLECTIONS, isCollectionKey, type CollectionDef, type CollectionKey } from "./registry";

export type Row = Record<string, unknown> & { id: string };

/** Righe massime caricate per una lista (uso personale: bastano e avanzano). */
export const LIST_LIMIT = 1000;

/**
 * Accesso per nome di tabella: le tabelle delle sezioni personali sono
 * scelte solo dal registro, mai dal browser.
 */
export async function hubClient(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}

/**
 * Log sicuro per salute e finanze: solo codice e messaggio dell'errore.
 * Mai i dettagli, che per alcuni errori del database contengono la riga
 * con i valori (es. "Failing row contains …").
 */
export function logSafeError(section: string, err: unknown): void {
  const e = (err ?? {}) as { code?: unknown; message?: unknown };
  const code = typeof e.code === "string" ? e.code : "n/d";
  const message = typeof e.message === "string" ? e.message.slice(0, 200) : "errore";
  console.error(`[${section}] Errore (${code}): ${message}`);
}

/** Spazio di lavoro del proprietario: le sezioni personali sono solo sue. */
export async function requireOwner() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Sessione scaduta: accedi di nuovo.");
  if (!workspace.isOwner) throw new Error("Operazione non consentita.");
  return workspace;
}

export async function listRows(
  c: CollectionDef,
  opts: { parentField?: string; parentId?: string; limit?: number } = {},
): Promise<Row[]> {
  const workspace = await requireOwner();
  const supabase = await hubClient();
  let q = supabase.from(c.table).select("*").eq("workspace_id", workspace.id);
  if (c.trash) q = q.is("deleted_at", null);
  if (opts.parentField && opts.parentId) q = q.eq(opts.parentField, opts.parentId);
  for (const s of c.sort) q = q.order(s.field, { ascending: s.asc, nullsFirst: false });
  const { data, error } = await q.limit(opts.limit ?? LIST_LIMIT);
  if (error) throw error;
  return (data ?? []) as Row[];
}

export async function getRow(c: CollectionDef, id: string): Promise<Row | null> {
  const workspace = await requireOwner();
  const supabase = await hubClient();
  let q = supabase.from(c.table).select("*").eq("workspace_id", workspace.id).eq("id", id);
  if (c.trash) q = q.is("deleted_at", null);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return (data as Row | null) ?? null;
}

/** Testo che rappresenta una riga (per i menu a tendina dei campi "ref"). */
export function rowLabel(c: CollectionDef, row: Row): string {
  const t = row[c.titleField];
  return typeof t === "string" && t ? t : "Senza titolo";
}

/** Scelte per i campi "ref" delle sezioni indicate (es. categorie, esercizi). */
export async function refOptionsFor(collections: CollectionDef[]): Promise<Record<string, Option[]>> {
  const refs = new Set<string>();
  for (const c of collections) for (const f of c.fields) if (f.type === "ref" && f.ref) refs.add(f.ref);
  const out: Record<string, Option[]> = {};
  await Promise.all(
    [...refs].map(async (key) => {
      if (!isCollectionKey(key)) return;
      const rc = COLLECTIONS[key];
      const rows = await listRows(rc, { limit: 2000 });
      out[key] = rows.map((r) => ({ value: r.id, label: rowLabel(rc, r) }));
      if (key === "categories") {
        // Categorie: si capisce subito se sono di entrata o di uscita.
        out[key] = rows.map((r) => ({ value: r.id, label: `${rowLabel(rc, r)}${r.tipo === "entrata" ? " (entrata)" : ""}` }));
      }
    }),
  );
  return out;
}

/** Mappa id → etichetta per ogni campo "ref" (per mostrare i nomi nelle liste). */
export function refLabelMaps(c: CollectionDef, options: Record<string, Option[]>): Record<string, Record<string, string>> {
  const maps: Record<string, Record<string, string>> = {};
  for (const f of c.fields) {
    if (f.type !== "ref" || !f.ref) continue;
    maps[f.key] = Object.fromEntries((options[f.ref] ?? []).map((o) => [o.value, o.label]));
  }
  return maps;
}

export function collectionOrNull(key: string): CollectionDef | null {
  return isCollectionKey(key) ? COLLECTIONS[key as CollectionKey] : null;
}
