"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDays, parseValues, todayIso, type FieldErrors } from "@/lib/hub/fields";
import {
  COLLECTIONS,
  childDef,
  detailHref,
  isCollectionKey,
  type CollectionDef,
  type CollectionKey,
} from "@/lib/hub/registry";
import { hubClient, logSafeError, requireOwner, type Row } from "@/lib/hub/server";

export type SaveResult =
  | { ok: true; id: string; href: string | null }
  | { ok: false; message: string; errors?: FieldErrors };

const idSchema = z.string().uuid();
const GENERIC_ERROR = "Salvataggio non riuscito. Riprova tra poco.";

function collection(key: string): CollectionDef {
  if (!isCollectionKey(key)) throw new Error("Sezione non valida");
  return COLLECTIONS[key];
}

function revalidateArea(c: CollectionDef) {
  revalidatePath(`/${c.area}`, "layout");
  revalidatePath("/dashboard");
}

/**
 * Regole automatiche al salvataggio: segnare "finito/fatto/letto" fissa la
 * data di completamento (da cui partono i ripassi), se non c'è già.
 */
function applyAutomaticRules(key: CollectionKey, values: Record<string, unknown>) {
  const today = todayIso();
  if (key === "books" && values.stato === "finito" && !values.data_fine) values.data_fine = today;
  if (key === "books" && values.stato === "in_lettura" && !values.data_inizio) values.data_inizio = today;
  if (key === "modules" && values.stato === "fatto" && !values.completato_il) values.completato_il = today;
  if (key === "readings" && values.stato === "letto" && !values.completato_il) values.completato_il = today;
  if (key === "goals" && typeof values.obiettivo_cent === "number" && typeof values.accantonato_cent === "number"
      && values.accantonato_cent >= values.obiettivo_cent && values.stato === "attivo") {
    values.stato = "raggiunto";
  }
}

/** Crea o modifica un elemento di una sezione (anche figlia, con il suo genitore). */
export async function saveItem(
  key: string,
  id: string | null,
  raw: Record<string, unknown>,
  parent?: { collection: string; field: string; id: string },
): Promise<SaveResult> {
  try {
    const c = collection(key);
    if (id) idSchema.parse(id);

    const parsed = parseValues(c.fields, raw);
    if (!parsed.ok) return { ok: false, message: "Controlla i campi evidenziati.", errors: parsed.errors };
    const values = parsed.values;
    applyAutomaticRules(c.key as CollectionKey, values);

    const workspace = await requireOwner();
    const supabase = await hubClient();

    if (parent) {
      if (!isCollectionKey(parent.collection) || !childDef(parent.collection, c.key as CollectionKey, parent.field)) {
        return { ok: false, message: "Collegamento non valido." };
      }
      idSchema.parse(parent.id);
    }

    let savedId: string;
    if (id) {
      let q = supabase.from(c.table).update(values).eq("id", id).eq("workspace_id", workspace.id);
      if (c.trash) q = q.is("deleted_at", null);
      const { data, error } = await q.select("id");
      if (error) throw error;
      if (!data?.length) return { ok: false, message: "Elemento non trovato (forse è nel cestino)." };
      savedId = id;
    } else {
      const row: Record<string, unknown> = { ...values, workspace_id: workspace.id };
      if (parent) row[parent.field] = parent.id;
      const { data, error } = await supabase.from(c.table).insert(row).select("id").single();
      if (error) throw error;
      savedId = (data as { id: string }).id;
    }

    revalidateArea(c);
    if (parent && isCollectionKey(parent.collection)) {
      revalidatePath(detailHref(COLLECTIONS[parent.collection], parent.id));
    }
    return { ok: true, id: savedId, href: c.slug ? detailHref(c, savedId) : null };
  } catch (err) {
    logSafeError(`Salvataggio ${key}`, err);
    if ((err as { code?: string })?.code === "23505") {
      return { ok: false, message: "Esiste già un elemento uguale (es. lo stesso parametro nello stesso giorno)." };
    }
    return { ok: false, message: GENERIC_ERROR };
  }
}

/** Elimina un elemento di una sezione figlia (capitoli, serie, highlights…). */
export async function deleteChildItem(key: string, id: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const c = collection(key);
    if (c.trash) return { ok: false, message: "Usa “Sposta nel cestino”." };
    idSchema.parse(id);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { error } = await supabase.from(c.table).delete().eq("id", id).eq("workspace_id", workspace.id);
    if (error) throw error;
    revalidateArea(c);
    return { ok: true };
  } catch (err) {
    logSafeError(`Eliminazione ${key}`, err);
    return { ok: false, message: "Eliminazione non riuscita." };
  }
}

/** Segna un ripasso come fatto (al massimo 3: 1 giorno, 1 settimana, 1 mese). */
export async function markReviewed(key: string, id: string): Promise<{ ok: boolean }> {
  try {
    const c = collection(key);
    if (!c.reviewable) return { ok: false };
    idSchema.parse(id);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data, error } = await supabase
      .from(c.table)
      .select("ripassi")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false };
    const next = Math.min(3, Number((data as { ripassi: number }).ripassi ?? 0) + 1);
    const { error: upErr } = await supabase
      .from(c.table)
      .update({ ripassi: next })
      .eq("id", id)
      .eq("workspace_id", workspace.id);
    if (upErr) throw upErr;
    revalidatePath("/studi", "layout");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    logSafeError(`Ripasso ${key}`, err);
    return { ok: false };
  }
}

/** Colonne copiabili di una riga: solo i campi dichiarati, senza i ripassi. */
function copyableValues(c: CollectionDef, row: Row): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of c.fields) {
    if (f.key === "ripassi" || f.key === "completato_il") continue;
    if (row[f.key] !== undefined) out[f.key] = row[f.key];
  }
  return out;
}

/**
 * Duplica un elemento con le sue sezioni figlie (es. una scheda con i suoi
 * esercizi, un corso con le lezioni): è il modo per usarlo come modello.
 */
export async function duplicateItem(key: string, id: string): Promise<SaveResult> {
  try {
    const c = collection(key);
    idSchema.parse(id);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data: src, error } = await supabase
      .from(c.table)
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle();
    if (error) throw error;
    if (!src) return { ok: false, message: "Elemento non trovato." };

    const values = copyableValues(c, src as Row);
    const title = values[c.titleField];
    if (typeof title === "string") values[c.titleField] = `${title} (copia)`.slice(0, 300);
    if (c.key === "books") Object.assign(values, { stato: "da_leggere", data_inizio: null, data_fine: null, voto: null });
    const { data: created, error: insErr } = await supabase
      .from(c.table)
      .insert({ ...values, workspace_id: workspace.id })
      .select("id")
      .single();
    if (insErr) throw insErr;
    const newId = (created as { id: string }).id;

    for (const child of c.children ?? []) {
      if (!isCollectionKey(child.collection)) continue;
      const cc = COLLECTIONS[child.collection];
      const { data: kids, error: kErr } = await supabase
        .from(cc.table)
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq(child.parentField, id);
      if (kErr) throw kErr;
      const rows = (kids ?? []).map((k) => {
        const v = copyableValues(cc, k as Row);
        if (cc.key === "modules") v.stato = "da_fare";
        return { ...v, workspace_id: workspace.id, [child.parentField]: newId };
      });
      if (rows.length) {
        const { error: cErr } = await supabase.from(cc.table).insert(rows);
        if (cErr) throw cErr;
      }
    }

    revalidateArea(c);
    return { ok: true, id: newId, href: c.slug ? detailHref(c, newId) : null };
  } catch (err) {
    logSafeError(`Duplicazione ${key}`, err);
    return { ok: false, message: "Duplicazione non riuscita." };
  }
}

/* ------------------------------------------------------------------ */
/* Benessere: avvia un allenamento da una scheda                       */
/* ------------------------------------------------------------------ */

function firstNumber(s: unknown): number | null {
  const m = typeof s === "string" ? s.match(/\d+/) : null;
  if (!m) return null;
  const n = Number(m[0]);
  return n <= 1000 ? n : null;
}

export async function startSessionFromTemplate(templateId: string): Promise<SaveResult> {
  try {
    idSchema.parse(templateId);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data: tpl, error } = await supabase
      .from("wk_templates")
      .select("id, nome")
      .eq("id", templateId)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!tpl) return { ok: false, message: "Scheda non trovata." };

    const { data: items, error: iErr } = await supabase
      .from("wk_template_items")
      .select("exercise_id, ordine, serie, ripetizioni, carico_kg")
      .eq("workspace_id", workspace.id)
      .eq("template_id", templateId)
      .order("ordine", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (iErr) throw iErr;

    const { data: session, error: sErr } = await supabase
      .from("wk_sessions")
      .insert({ workspace_id: workspace.id, data: todayIso(), titolo: (tpl as { nome: string }).nome, template_id: templateId })
      .select("id")
      .single();
    if (sErr) throw sErr;
    const sessionId = (session as { id: string }).id;

    const sets: Record<string, unknown>[] = [];
    let ordine = 1;
    for (const it of (items ?? []) as Record<string, unknown>[]) {
      const count = Math.min(20, Math.max(1, Number(it.serie ?? 1)));
      for (let i = 0; i < count; i++) {
        sets.push({
          workspace_id: workspace.id,
          session_id: sessionId,
          exercise_id: it.exercise_id,
          ordine: ordine++,
          ripetizioni: firstNumber(it.ripetizioni),
          carico_kg: it.carico_kg ?? null,
        });
      }
    }
    if (sets.length) {
      const { error: setErr } = await supabase.from("wk_sets").insert(sets);
      if (setErr) throw setErr;
    }
    revalidatePath("/benessere", "layout");
    return { ok: true, id: sessionId, href: detailHref(COLLECTIONS.sessions, sessionId) };
  } catch (err) {
    logSafeError("Avvio allenamento", err);
    return { ok: false, message: "Non è stato possibile avviare l'allenamento." };
  }
}

/* ------------------------------------------------------------------ */
/* Finanze: registra una spesa ricorrente                              */
/* ------------------------------------------------------------------ */

const MONTHS_BY_FREQ: Record<string, number> = { mensile: 1, bimestrale: 2, trimestrale: 3, semestrale: 6, annuale: 12 };

/** Prossima scadenza dopo `iso` (il giorno del mese resta, se esiste). */
function advanceDate(iso: string, frequenza: string): string {
  if (frequenza === "settimanale") return addDays(iso, 7);
  const months = MONTHS_BY_FREQ[frequenza] ?? 1;
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export async function registerRecurring(id: string): Promise<SaveResult> {
  try {
    idSchema.parse(id);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data: r, error } = await supabase
      .from("fin_recurring")
      .select("id, nome, tipo, importo_cent, frequenza, prossima_data, categoria_id, conto_id")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!r) return { ok: false, message: "Spesa ricorrente non trovata." };
    const rec = r as Record<string, string | number | null>;

    const { data: tx, error: tErr } = await supabase
      .from("fin_transactions")
      .insert({
        workspace_id: workspace.id,
        data: rec.prossima_data,
        tipo: rec.tipo,
        importo_cent: rec.importo_cent,
        descrizione: rec.nome,
        categoria_id: rec.categoria_id,
        conto_id: rec.conto_id,
        ricorrente_id: rec.id,
      })
      .select("id")
      .single();
    if (tErr) throw tErr;

    const next = advanceDate(String(rec.prossima_data), String(rec.frequenza));
    const { error: uErr } = await supabase
      .from("fin_recurring")
      .update({ prossima_data: next })
      .eq("id", id)
      .eq("workspace_id", workspace.id);
    if (uErr) throw uErr;

    revalidatePath("/finanze", "layout");
    revalidatePath("/dashboard");
    const txId = (tx as { id: string }).id;
    return { ok: true, id: txId, href: detailHref(COLLECTIONS.transactions, txId) };
  } catch (err) {
    logSafeError("Registrazione ricorrente", err);
    return { ok: false, message: "Registrazione non riuscita." };
  }
}
