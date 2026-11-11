"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { missingFromLibrary, normalizeName } from "@/lib/hub/exercise-library";
import { COLLECTIONS, isCollectionKey } from "@/lib/hub/registry";
import { hubClient, logSafeError, requireOwner } from "@/lib/hub/server";
import { SET_COLUMNS, toSetRow, type SetRow } from "@/lib/hub/set-row";
import { countsForStats, estimatedOneRepMax, parseTemplateSets, setVolume, summarizeTemplateSets, type TemplateSet } from "@/lib/hub/workout";
import { groupWorkoutRows, type WorkoutRow } from "@/lib/hub/workout-import";

const id = z.string().uuid();
const GENERIC = "Operazione non riuscita. Riprova tra poco.";

function revalidateWorkouts() {
  revalidatePath("/benessere", "layout");
  revalidatePath("/dashboard");
}

/* ------------------------------------------------------------------ */
/* Serie di un allenamento                                             */
/* ------------------------------------------------------------------ */

const updateSchema = z.object({
  id,
  ripetizioni: z.number().int().min(0).max(1000).nullable(),
  carico_kg: z.number().min(0).max(1000).nullable(),
  fatta: z.boolean(),
  tipo: z.enum(["normale", "riscaldamento", "drop", "cedimento"]).optional(),
  durata_s: z.number().int().min(0).max(86400).nullable().optional(),
});

/** Salva ripetizioni, carico e "fatta" di una serie. */
export async function updateSet(input: unknown): Promise<{ ok: boolean }> {
  try {
    const v = updateSchema.parse(input);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { error } = await supabase
      .from("wk_sets")
      .update({
        ripetizioni: v.ripetizioni,
        carico_kg: v.carico_kg,
        fatta: v.fatta,
        ...(v.tipo ? { tipo: v.tipo } : {}),
        ...(v.durata_s !== undefined ? { durata_s: v.durata_s } : {}),
      })
      .eq("id", v.id)
      .eq("workspace_id", workspace.id);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    logSafeError("Aggiornamento serie", err);
    return { ok: false };
  }
}

/** Aggiunge una serie a un esercizio dell'allenamento (copia l'ultima, se c'è). */
export async function addSet(sessionId: string, exerciseId: string): Promise<{ ok: true; set: SetRow } | { ok: false; message: string }> {
  try {
    id.parse(sessionId);
    id.parse(exerciseId);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data: sess, error: sErr } = await supabase
      .from("wk_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!sess) return { ok: false, message: "Allenamento non trovato." };

    const { data: existing, error } = await supabase
      .from("wk_sets")
      .select("exercise_id, ordine, ripetizioni, carico_kg, tipo, rip_min, rip_max, durata_s, recupero_s, superset, nota_esercizio")
      .eq("workspace_id", workspace.id)
      .eq("session_id", sessionId)
      .order("ordine", { ascending: true, nullsFirst: true });
    if (error) throw error;
    const rows = (existing ?? []) as (Record<string, unknown> & { exercise_id: string; ordine: number | null; ripetizioni: number | null; carico_kg: number | null })[];
    const nextOrder = rows.reduce((m, r) => Math.max(m, r.ordine ?? 0), 0) + 1;
    if (rows.length >= 400) return { ok: false, message: "Troppe serie in un solo allenamento." };
    const last = [...rows].reverse().find((r) => r.exercise_id === exerciseId);
    // Una serie nuova ripete l'ultima dello stesso esercizio (tipo "normale" se era un riscaldamento).
    const lastWork = [...rows].reverse().find((r) => r.exercise_id === exerciseId && r.tipo !== "riscaldamento") ?? last;

    const { data: created, error: insErr } = await supabase
      .from("wk_sets")
      .insert({
        workspace_id: workspace.id,
        session_id: sessionId,
        exercise_id: exerciseId,
        ordine: nextOrder,
        ripetizioni: lastWork?.ripetizioni ?? null,
        carico_kg: lastWork?.carico_kg ?? null,
        rip_min: lastWork?.rip_min ?? null,
        rip_max: lastWork?.rip_max ?? null,
        durata_s: lastWork?.durata_s ?? null,
        recupero_s: lastWork?.recupero_s ?? null,
        superset: lastWork?.superset ?? null,
        nota_esercizio: lastWork?.nota_esercizio ?? null,
        fatta: false,
      })
      .select(SET_COLUMNS)
      .single();
    if (insErr) throw insErr;
    return { ok: true, set: toSetRow(created as Record<string, unknown>) };
  } catch (err) {
    logSafeError("Nuova serie", err);
    return { ok: false, message: GENERIC };
  }
}

export async function deleteSet(setId: string): Promise<{ ok: boolean }> {
  try {
    id.parse(setId);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { error } = await supabase.from("wk_sets").delete().eq("id", setId).eq("workspace_id", workspace.id);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    logSafeError("Eliminazione serie", err);
    return { ok: false };
  }
}

export type SessionRecord = { exercise_id: string; kinds: ("peso" | "massimale" | "volume")[] };
export type FinishResult = { ok: true; records: SessionRecord[]; sets: number; volume: number } | { ok: false };

/**
 * Conclude l'allenamento: salva la durata e confronta ogni esercizio con tutto
 * lo storico, così la schermata finale può mostrare i record battuti.
 * Il riscaldamento non conta; senza storico precedente non si parla di record.
 */
export async function finishSession(sessionId: string, minutes: number, removeUndone = false): Promise<FinishResult> {
  try {
    id.parse(sessionId);
    const m = z.number().int().min(1).max(600).parse(Math.round(minutes));
    const workspace = await requireOwner();
    const supabase = await hubClient();
    if (removeUndone) {
      const { error: dErr } = await supabase.from("wk_sets").delete().eq("workspace_id", workspace.id).eq("session_id", sessionId).eq("fatta", false);
      if (dErr) throw dErr;
    }
    const { error } = await supabase
      .from("wk_sessions")
      .update({ durata_min: m })
      .eq("id", sessionId)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null);
    if (error) throw error;

    const { data: mine, error: mErr } = await supabase
      .from("wk_sets")
      .select("exercise_id, ripetizioni, carico_kg, tipo, fatta")
      .eq("workspace_id", workspace.id)
      .eq("session_id", sessionId)
      .eq("fatta", true)
      .limit(1000);
    if (mErr) throw mErr;
    type Lite = { exercise_id: string; ripetizioni: number | null; carico_kg: number | null; tipo: string };
    const today = ((mine ?? []) as Lite[]).filter((s) => countsForStats(s)).map((s) => ({ ...s, carico_kg: s.carico_kg == null ? null : Number(s.carico_kg) }));
    const exerciseIds = [...new Set(today.map((s) => s.exercise_id))];

    const records: SessionRecord[] = [];
    if (exerciseIds.length) {
      const { data: past, error: pErr } = await supabase
        .from("wk_sets")
        .select("exercise_id, ripetizioni, carico_kg, tipo, wk_sessions!inner(deleted_at)")
        .eq("workspace_id", workspace.id)
        .in("exercise_id", exerciseIds)
        .eq("fatta", true)
        .neq("session_id", sessionId)
        .is("wk_sessions.deleted_at", null)
        .limit(20000);
      if (pErr) throw pErr;
      const best = new Map<string, { w: number; rm: number; v: number }>();
      for (const r of (past ?? []) as unknown as Lite[]) {
        if (!countsForStats(r)) continue;
        const cur = best.get(r.exercise_id) ?? { w: 0, rm: 0, v: 0 };
        const kg = r.carico_kg == null ? null : Number(r.carico_kg);
        cur.w = Math.max(cur.w, kg ?? 0);
        cur.rm = Math.max(cur.rm, estimatedOneRepMax({ ripetizioni: r.ripetizioni, carico_kg: kg }));
        cur.v = Math.max(cur.v, setVolume({ ripetizioni: r.ripetizioni, carico_kg: kg }));
        best.set(r.exercise_id, cur);
      }
      for (const ex of exerciseIds) {
        const prev = best.get(ex);
        if (!prev) continue;
        const sets = today.filter((s) => s.exercise_id === ex);
        const kinds: SessionRecord["kinds"] = [];
        if (sets.some((s) => (s.carico_kg ?? 0) > prev.w && prev.w > 0)) kinds.push("peso");
        if (sets.some((s) => estimatedOneRepMax(s) > prev.rm + 0.01 && prev.rm > 0)) kinds.push("massimale");
        if (sets.some((s) => setVolume(s) > prev.v && prev.v > 0)) kinds.push("volume");
        if (kinds.length) records.push({ exercise_id: ex, kinds });
      }
    }
    revalidateWorkouts();
    return { ok: true, records, sets: today.length, volume: Math.round(today.reduce((n, s) => n + setVolume(s), 0)) };
  } catch (err) {
    logSafeError("Fine allenamento", err);
    return { ok: false };
  }
}

/** Scarta un allenamento (va nel cestino, si può recuperare). */
export async function discardSession(sessionId: string): Promise<{ ok: boolean }> {
  try {
    id.parse(sessionId);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { error } = await supabase
      .from("wk_sessions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("workspace_id", workspace.id);
    if (error) throw error;
    revalidateWorkouts();
    return { ok: true };
  } catch (err) {
    logSafeError("Allenamento scartato", err);
    return { ok: false };
  }
}

/** Crea un esercizio al volo (dall'allenamento) e lo restituisce; se esiste già con lo stesso nome, usa quello. */
export async function createExercise(nome: string, misura: "peso_rip" | "durata"): Promise<{ ok: true; id: string; nome: string; misura: string } | { ok: false; message: string }> {
  try {
    const name = z.string().trim().min(1).max(120).parse(nome);
    const m = z.enum(["peso_rip", "durata"]).parse(misura);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data: existing, error: eErr } = await supabase
      .from("wk_exercises")
      .select("id, nome, misura")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .limit(5000);
    if (eErr) throw eErr;
    const found = ((existing ?? []) as { id: string; nome: string; misura: string }[]).find((e) => normalizeName(e.nome) === normalizeName(name));
    if (found) return { ok: true, id: found.id, nome: found.nome, misura: found.misura };
    const { data, error } = await supabase.from("wk_exercises").insert({ workspace_id: workspace.id, nome: name, misura: m }).select("id, nome, misura").single();
    if (error) throw error;
    revalidateWorkouts();
    const row = data as { id: string; nome: string; misura: string };
    return { ok: true, id: row.id, nome: row.nome, misura: row.misura };
  } catch (err) {
    logSafeError("Nuovo esercizio", err);
    return { ok: false, message: "Non è stato possibile creare l'esercizio." };
  }
}

/** Toglie un esercizio (con tutte le sue serie) dall'allenamento in corso. */
export async function removeExercise(sessionId: string, exerciseId: string): Promise<{ ok: boolean }> {
  try {
    id.parse(sessionId);
    id.parse(exerciseId);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { error } = await supabase.from("wk_sets").delete().eq("workspace_id", workspace.id).eq("session_id", sessionId).eq("exercise_id", exerciseId);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    logSafeError("Esercizio tolto", err);
    return { ok: false };
  }
}

/** Sposta un esercizio su o giù nell'allenamento in corso. */
export async function moveExercise(sessionId: string, exerciseId: string, direction: "up" | "down"): Promise<{ ok: boolean; order?: Record<string, number> }> {
  try {
    id.parse(sessionId);
    id.parse(exerciseId);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data, error } = await supabase
      .from("wk_sets")
      .select("id, exercise_id, ordine, created_at")
      .eq("workspace_id", workspace.id)
      .eq("session_id", sessionId)
      .order("ordine", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(1000);
    if (error) throw error;
    const rows = (data ?? []) as { id: string; exercise_id: string; ordine: number | null }[];
    const order: string[] = [];
    for (const r of rows) if (!order.includes(r.exercise_id)) order.push(r.exercise_id);
    const i = order.indexOf(exerciseId);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= order.length) return { ok: true };
    [order[i], order[j]] = [order[j], order[i]];
    const next: Record<string, number> = {};
    let n = 1;
    for (const ex of order) for (const r of rows.filter((x) => x.exercise_id === ex)) next[r.id] = n++;
    for (const r of rows) {
      if (r.ordine === next[r.id]) continue;
      const { error: uErr } = await supabase.from("wk_sets").update({ ordine: next[r.id] }).eq("id", r.id).eq("workspace_id", workspace.id);
      if (uErr) throw uErr;
    }
    return { ok: true, order: next };
  } catch (err) {
    logSafeError("Esercizio spostato", err);
    return { ok: false };
  }
}

/** Parte un allenamento vuoto: gli esercizi si aggiungono man mano. */
export async function startEmptySession(): Promise<{ ok: true; href: string } | { ok: false; message: string }> {
  try {
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const { data, error } = await supabase
      .from("wk_sessions")
      .insert({ workspace_id: workspace.id, data: today, titolo: "Allenamento" })
      .select("id")
      .single();
    if (error) throw error;
    revalidateWorkouts();
    return { ok: true, href: `/benessere/allenamenti/${(data as { id: string }).id}` };
  } catch (err) {
    logSafeError("Allenamento vuoto", err);
    return { ok: false, message: "Non è stato possibile avviare l'allenamento." };
  }
}

/**
 * Porta nella scheda i carichi usati oggi, serie per serie (riscaldamento con
 * riscaldamento, serie di lavoro con serie di lavoro). Così la prossima volta
 * parti da lì, come "aggiorna la routine" in Lyfta.
 */
export async function updateTemplateFromSession(sessionId: string): Promise<{ ok: boolean; updated: number; message?: string }> {
  try {
    id.parse(sessionId);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data: sess, error } = await supabase
      .from("wk_sessions")
      .select("id, template_id")
      .eq("id", sessionId)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    const templateId = (sess as { template_id: string | null } | null)?.template_id;
    if (!templateId) return { ok: false, updated: 0, message: "Questo allenamento non parte da una scheda." };

    const { data: sets, error: sErr } = await supabase
      .from("wk_sets")
      .select("exercise_id, carico_kg, tipo, ordine")
      .eq("workspace_id", workspace.id)
      .eq("session_id", sessionId)
      .eq("fatta", true)
      .not("carico_kg", "is", null)
      .order("ordine", { ascending: true, nullsFirst: false });
    if (sErr) throw sErr;
    const warm = new Map<string, number[]>();
    const work = new Map<string, number[]>();
    for (const s of (sets ?? []) as { exercise_id: string; carico_kg: number; tipo: string }[]) {
      const target = s.tipo === "riscaldamento" ? warm : work;
      target.set(s.exercise_id, [...(target.get(s.exercise_id) ?? []), Number(s.carico_kg)]);
    }

    const { data: items, error: iErr } = await supabase
      .from("wk_template_items")
      .select("id, exercise_id, dettaglio")
      .eq("workspace_id", workspace.id)
      .eq("template_id", templateId);
    if (iErr) throw iErr;
    let updated = 0;
    for (const it of (items ?? []) as { id: string; exercise_id: string; dettaglio: unknown }[]) {
      const w = warm.get(it.exercise_id) ?? [];
      const k = work.get(it.exercise_id) ?? [];
      if (!w.length && !k.length) continue;
      const tpl = parseTemplateSets(it.dettaglio);
      let wi = 0;
      let ki = 0;
      const nextSets: TemplateSet[] = tpl.map((t) => {
        const kg = t.t === "riscaldamento" ? w[wi++] : k[ki++];
        return kg === undefined ? t : { ...t, kg };
      });
      const patch: Record<string, unknown> = { carico_kg: k.length ? Math.max(...k) : null };
      if (tpl.length) patch.dettaglio = nextSets;
      const { error: uErr } = await supabase.from("wk_template_items").update(patch).eq("id", it.id).eq("workspace_id", workspace.id);
      if (uErr) throw uErr;
      updated++;
    }
    revalidateWorkouts();
    return { ok: true, updated };
  } catch (err) {
    logSafeError("Aggiornamento scheda", err);
    return { ok: false, updated: 0, message: GENERIC };
  }
}

/* ------------------------------------------------------------------ */
/* Editor delle schede (serie per serie)                               */
/* ------------------------------------------------------------------ */

const tplSetSchema = z.object({
  t: z.enum(["normale", "riscaldamento", "drop", "cedimento"]),
  rip: z.number().int().min(0).max(1000).nullable(),
  min: z.number().int().min(0).max(1000).nullable(),
  max: z.number().int().min(0).max(1000).nullable(),
  kg: z.number().min(0).max(1000).nullable(),
  dur: z.number().int().min(0).max(86400).nullable(),
});

const itemSchema = z.object({
  templateId: id,
  itemId: id.nullable(),
  exerciseId: id,
  recupero_s: z.number().int().min(0).max(1800).nullable(),
  superset: z.number().int().min(1).max(20).nullable(),
  note: z.string().trim().max(500).nullable(),
  sets: z.array(tplSetSchema).max(30),
});

/** Salva (o crea) un esercizio di una scheda con tutte le sue serie. */
export async function saveTemplateItem(input: unknown): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  try {
    const v = itemSchema.parse(input);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const summary = summarizeTemplateSets(v.sets);
    const values = {
      exercise_id: v.exerciseId,
      recupero_s: v.recupero_s,
      superset: v.superset,
      note: v.note || null,
      dettaglio: v.sets,
      serie: v.sets.length ? summary.serie : 1,
      ripetizioni: summary.ripetizioni,
      carico_kg: summary.carico_kg,
    };
    if (v.itemId) {
      const { error } = await supabase.from("wk_template_items").update(values).eq("id", v.itemId).eq("workspace_id", workspace.id);
      if (error) throw error;
      revalidatePath("/benessere", "layout");
      return { ok: true, id: v.itemId };
    }
    const { data: tpl, error: tErr } = await supabase
      .from("wk_templates")
      .select("id")
      .eq("id", v.templateId)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!tpl) return { ok: false, message: "Scheda non trovata." };
    const { data: last, error: lErr } = await supabase
      .from("wk_template_items")
      .select("ordine")
      .eq("workspace_id", workspace.id)
      .eq("template_id", v.templateId)
      .order("ordine", { ascending: false, nullsFirst: false })
      .limit(1);
    if (lErr) throw lErr;
    const ordine = Math.min(99, Number((last as { ordine: number | null }[] | null)?.[0]?.ordine ?? 0) + 1);
    const { data, error } = await supabase
      .from("wk_template_items")
      .insert({ ...values, workspace_id: workspace.id, template_id: v.templateId, ordine })
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/benessere", "layout");
    return { ok: true, id: (data as { id: string }).id };
  } catch (err) {
    logSafeError("Esercizio della scheda", err);
    return { ok: false, message: "Non è stato possibile salvare l'esercizio." };
  }
}

export async function deleteTemplateItem(itemId: string): Promise<{ ok: boolean }> {
  try {
    id.parse(itemId);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { error } = await supabase.from("wk_template_items").delete().eq("id", itemId).eq("workspace_id", workspace.id);
    if (error) throw error;
    revalidatePath("/benessere", "layout");
    return { ok: true };
  } catch (err) {
    logSafeError("Esercizio tolto dalla scheda", err);
    return { ok: false };
  }
}

/* ------------------------------------------------------------------ */
/* Riordino degli esercizi di una scheda                               */
/* ------------------------------------------------------------------ */

/** Sposta una voce (es. un esercizio della scheda) su o giù e rinumera le altre. */
export async function moveChild(key: string, itemId: string, direction: "up" | "down"): Promise<{ ok: boolean }> {
  try {
    if (!isCollectionKey(key)) return { ok: false };
    const c = COLLECTIONS[key];
    if (!c.reorderable) return { ok: false };
    id.parse(itemId);
    const parent = Object.values(COLLECTIONS)
      .flatMap((p) => p.children ?? [])
      .find((ch) => ch.collection === key);
    if (!parent) return { ok: false };

    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data: row, error } = await supabase
      .from(c.table)
      .select(`id, ${parent.parentField}`)
      .eq("id", itemId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: false };
    const parentId = (row as unknown as Record<string, string>)[parent.parentField];

    const { data: siblings, error: sErr } = await supabase
      .from(c.table)
      .select("id, ordine")
      .eq("workspace_id", workspace.id)
      .eq(parent.parentField, parentId)
      .order("ordine", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (sErr) throw sErr;
    const list = (siblings ?? []) as { id: string; ordine: number | null }[];
    const i = list.findIndex((s) => s.id === itemId);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= list.length) return { ok: true };
    [list[i], list[j]] = [list[j], list[i]];

    for (let n = 0; n < list.length; n++) {
      if (list[n].ordine === n + 1) continue;
      const { error: uErr } = await supabase.from(c.table).update({ ordine: n + 1 }).eq("id", list[n].id).eq("workspace_id", workspace.id);
      if (uErr) throw uErr;
    }
    revalidatePath("/benessere", "layout");
    return { ok: true };
  } catch (err) {
    logSafeError("Riordino", err);
    return { ok: false };
  }
}

/* ------------------------------------------------------------------ */
/* Libreria di esercizi                                                */
/* ------------------------------------------------------------------ */

/** Aggiunge gli esercizi di base che non hai ancora (stesso nome = già presente). */
export async function seedExercises(): Promise<{ ok: boolean; added: number }> {
  try {
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data, error } = await supabase
      .from("wk_exercises")
      .select("nome")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .limit(5000);
    if (error) throw error;
    const missing = missingFromLibrary(((data ?? []) as { nome: string }[]).map((e) => e.nome));
    if (missing.length) {
      const { error: iErr } = await supabase.from("wk_exercises").insert(missing.map((e) => ({ ...e, workspace_id: workspace.id })));
      if (iErr) throw iErr;
    }
    revalidateWorkouts();
    return { ok: true, added: missing.length };
  } catch (err) {
    logSafeError("Libreria esercizi", err);
    return { ok: false, added: 0 };
  }
}

/* ------------------------------------------------------------------ */
/* Importazione dello storico (CSV di Lyfta, Hevy, Strong…)            */
/* ------------------------------------------------------------------ */

const workoutRowSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  titolo: z.string().trim().min(1).max(200),
  esercizio: z.string().trim().min(1).max(120),
  ripetizioni: z.number().int().min(0).max(1000).nullable(),
  carico_kg: z.number().min(0).max(1000).nullable(),
  fatta: z.boolean().optional(),
});

export type WorkoutImportResult =
  | { ok: true; sessions: number; sets: number; skipped: number; newExercises: number }
  | { ok: false; message: string };

/**
 * Importa allenamenti e serie. Un allenamento con la stessa data e lo stesso
 * titolo di uno già presente viene saltato (reimportare il file è sicuro).
 * Gli esercizi che non esistono vengono creati. Il client manda i dati a
 * gruppi di allenamenti interi, mai spezzati a metà.
 */
export async function importWorkouts(input: unknown): Promise<WorkoutImportResult> {
  try {
    const rows = z.array(workoutRowSchema).max(4000).parse(input) as WorkoutRow[];
    if (rows.length === 0) return { ok: true, sessions: 0, sets: 0, skipped: 0, newExercises: 0 };
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const groups = groupWorkoutRows(rows);

    // Esercizi esistenti e nuovi.
    const { data: ex, error: exErr } = await supabase
      .from("wk_exercises")
      .select("id, nome")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .limit(5000);
    if (exErr) throw exErr;
    const byName = new Map(((ex ?? []) as { id: string; nome: string }[]).map((e) => [normalizeName(e.nome), e.id]));
    const wanted = new Map<string, string>();
    for (const g of groups) for (const s of g.sets) if (!byName.has(normalizeName(s.esercizio))) wanted.set(normalizeName(s.esercizio), s.esercizio);
    let newExercises = 0;
    if (wanted.size) {
      const { data: created, error: cErr } = await supabase
        .from("wk_exercises")
        .insert([...wanted.values()].map((nome) => ({ workspace_id: workspace.id, nome })))
        .select("id, nome");
      if (cErr) throw cErr;
      for (const e of (created ?? []) as { id: string; nome: string }[]) byName.set(normalizeName(e.nome), e.id);
      newExercises = wanted.size;
    }

    // Allenamenti già presenti (stessa data e titolo): saltati.
    const dates = groups.map((g) => g.data).sort();
    const { data: have, error: hErr } = await supabase
      .from("wk_sessions")
      .select("data, titolo")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .gte("data", dates[0])
      .lte("data", dates[dates.length - 1])
      .limit(20000);
    if (hErr) throw hErr;
    const haveKeys = new Set(((have ?? []) as { data: string; titolo: string }[]).map((s) => `${s.data}|${s.titolo.toLowerCase()}`));
    const fresh = groups.filter((g) => !haveKeys.has(`${g.data}|${g.titolo.toLowerCase()}`));
    const skipped = groups.length - fresh.length;
    if (fresh.length === 0) return { ok: true, sessions: 0, sets: 0, skipped, newExercises };

    const { data: sessions, error: sErr } = await supabase
      .from("wk_sessions")
      .insert(fresh.map((g) => ({ workspace_id: workspace.id, data: g.data, titolo: g.titolo })))
      .select("id, data, titolo");
    if (sErr) throw sErr;
    const sessionId = new Map(((sessions ?? []) as { id: string; data: string; titolo: string }[]).map((s) => [`${s.data}|${s.titolo}`, s.id]));

    const sets: Record<string, unknown>[] = [];
    for (const g of fresh) {
      const sid = sessionId.get(`${g.data}|${g.titolo}`);
      if (!sid) continue;
      g.sets.forEach((s, i) =>
        sets.push({
          workspace_id: workspace.id,
          session_id: sid,
          exercise_id: byName.get(normalizeName(s.esercizio)),
          ordine: i + 1,
          ripetizioni: s.ripetizioni,
          carico_kg: s.carico_kg,
          fatta: s.fatta !== false,
        }),
      );
    }
    for (let i = 0; i < sets.length; i += 500) {
      const { error: setErr } = await supabase.from("wk_sets").insert(sets.slice(i, i + 500));
      if (setErr) throw setErr;
    }
    revalidateWorkouts();
    return { ok: true, sessions: fresh.length, sets: sets.length, skipped, newExercises };
  } catch (err) {
    logSafeError("Importazione allenamenti", err);
    return { ok: false, message: "Importazione non riuscita. Controlla le colonne scelte e riprova." };
  }
}

