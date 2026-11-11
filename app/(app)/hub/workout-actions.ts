"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { missingFromLibrary, normalizeName } from "@/lib/hub/exercise-library";
import { COLLECTIONS, isCollectionKey } from "@/lib/hub/registry";
import { hubClient, logSafeError, requireOwner } from "@/lib/hub/server";
import { groupWorkoutRows, type WorkoutRow } from "@/lib/hub/workout-import";

const id = z.string().uuid();
const GENERIC = "Operazione non riuscita. Riprova tra poco.";

export type SetRow = {
  id: string;
  exercise_id: string;
  ordine: number | null;
  ripetizioni: number | null;
  carico_kg: number | null;
  fatta: boolean;
};

function revalidateWorkouts() {
  revalidatePath("/benessere", "layout");
  revalidatePath("/dashboard");
}

const SET_COLUMNS = "id, exercise_id, ordine, ripetizioni, carico_kg, fatta";

function toSetRow(r: Record<string, unknown>): SetRow {
  return {
    id: String(r.id),
    exercise_id: String(r.exercise_id),
    ordine: r.ordine == null ? null : Number(r.ordine),
    ripetizioni: r.ripetizioni == null ? null : Number(r.ripetizioni),
    carico_kg: r.carico_kg == null ? null : Number(r.carico_kg),
    fatta: r.fatta !== false,
  };
}

/* ------------------------------------------------------------------ */
/* Serie di un allenamento                                             */
/* ------------------------------------------------------------------ */

const updateSchema = z.object({
  id,
  ripetizioni: z.number().int().min(0).max(1000).nullable(),
  carico_kg: z.number().min(0).max(1000).nullable(),
  fatta: z.boolean(),
});

/** Salva ripetizioni, carico e "fatta" di una serie. */
export async function updateSet(input: unknown): Promise<{ ok: boolean }> {
  try {
    const v = updateSchema.parse(input);
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { error } = await supabase
      .from("wk_sets")
      .update({ ripetizioni: v.ripetizioni, carico_kg: v.carico_kg, fatta: v.fatta })
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
      .select("exercise_id, ordine, ripetizioni, carico_kg")
      .eq("workspace_id", workspace.id)
      .eq("session_id", sessionId)
      .order("ordine", { ascending: true, nullsFirst: true });
    if (error) throw error;
    const rows = (existing ?? []) as { exercise_id: string; ordine: number | null; ripetizioni: number | null; carico_kg: number | null }[];
    const nextOrder = rows.reduce((m, r) => Math.max(m, r.ordine ?? 0), 0) + 1;
    if (rows.length >= 400) return { ok: false, message: "Troppe serie in un solo allenamento." };
    const last = [...rows].reverse().find((r) => r.exercise_id === exerciseId);

    const { data: created, error: insErr } = await supabase
      .from("wk_sets")
      .insert({
        workspace_id: workspace.id,
        session_id: sessionId,
        exercise_id: exerciseId,
        ordine: nextOrder,
        ripetizioni: last?.ripetizioni ?? null,
        carico_kg: last?.carico_kg ?? null,
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

/** Segna l'allenamento come concluso: salva la durata in minuti. */
export async function finishSession(sessionId: string, minutes: number): Promise<{ ok: boolean }> {
  try {
    id.parse(sessionId);
    const m = z.number().int().min(1).max(600).parse(Math.round(minutes));
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { error } = await supabase
      .from("wk_sessions")
      .update({ durata_min: m })
      .eq("id", sessionId)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null);
    if (error) throw error;
    revalidateWorkouts();
    return { ok: true };
  } catch (err) {
    logSafeError("Fine allenamento", err);
    return { ok: false };
  }
}

/**
 * Porta nella scheda i carichi usati oggi: per ogni esercizio, il carico più
 * alto tra le serie fatte. Così la prossima volta parti da lì.
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
      .select("exercise_id, carico_kg")
      .eq("workspace_id", workspace.id)
      .eq("session_id", sessionId)
      .eq("fatta", true)
      .not("carico_kg", "is", null);
    if (sErr) throw sErr;
    const best = new Map<string, number>();
    for (const s of (sets ?? []) as { exercise_id: string; carico_kg: number }[]) {
      best.set(s.exercise_id, Math.max(best.get(s.exercise_id) ?? 0, Number(s.carico_kg)));
    }
    let updated = 0;
    for (const [exerciseId, kg] of best) {
      const { data, error: uErr } = await supabase
        .from("wk_template_items")
        .update({ carico_kg: kg })
        .eq("workspace_id", workspace.id)
        .eq("template_id", templateId)
        .eq("exercise_id", exerciseId)
        .select("id");
      if (uErr) throw uErr;
      updated += data?.length ?? 0;
    }
    revalidateWorkouts();
    return { ok: true, updated };
  } catch (err) {
    logSafeError("Aggiornamento scheda", err);
    return { ok: false, updated: 0, message: GENERIC };
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

