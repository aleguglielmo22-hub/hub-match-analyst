import "server-only";
import { addDays, daysUntil, nextReviewDate, todayIso } from "./fields";
import { COLLECTIONS, detailHref } from "./registry";
import { hubClient, requireOwner } from "./server";

/* ------------------------------------------------------------------ */
/* Studi                                                               */
/* ------------------------------------------------------------------ */

export type Deadline = { id: string; title: string; date: string; days: number; kind: string; href: string };

export async function upcomingDeadlines(limit = 5): Promise<Deadline[]> {
  const workspace = await requireOwner();
  const supabase = await hubClient();
  const today = todayIso();
  const [{ data: exams, error }, { data: rec, error: rErr }] = await Promise.all([
    supabase
      .from("study_exams")
      .select("id, titolo, data, tipo")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .eq("stato", "in_programma")
      .gte("data", today)
      .order("data")
      .limit(limit),
    supabase
      .from("fin_recurring")
      .select("id, nome, prossima_data")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .eq("attivo", true)
      .lte("prossima_data", addDays(today, 7))
      .order("prossima_data")
      .limit(limit),
  ]);
  if (error) throw error;
  if (rErr) throw rErr;
  const out: Deadline[] = [
    ...((exams ?? []) as { id: string; titolo: string; data: string; tipo: string }[]).map((e) => ({
      id: e.id,
      title: e.titolo,
      date: e.data,
      days: daysUntil(e.data),
      kind: e.tipo === "esame" ? "Esame" : e.tipo === "consegna" ? "Consegna" : "Scadenza",
      href: detailHref(COLLECTIONS.exams, e.id),
    })),
    ...((rec ?? []) as { id: string; nome: string; prossima_data: string }[]).map((r) => ({
      id: r.id,
      title: r.nome,
      date: r.prossima_data,
      days: daysUntil(r.prossima_data),
      kind: "Pagamento",
      href: detailHref(COLLECTIONS.recurring, r.id),
    })),
  ];
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}

export type ReviewItem = {
  key: "chapters" | "modules" | "highlights" | "readings";
  id: string;
  title: string;
  context: string;
  due: string;
  days: number;
  step: number;
  href: string;
};

/** Ripassi a distanza: dovuti oggi (o in ritardo) e, a parte, quelli in arrivo. */
export async function reviewQueue(): Promise<ReviewItem[]> {
  const workspace = await requireOwner();
  const supabase = await hubClient();
  const base = (table: string, cols: string) =>
    supabase.from(table).select(cols).eq("workspace_id", workspace.id).not("completato_il", "is", null).lt("ripassi", 3).limit(1000);

  const [ch, mo, hi, re] = await Promise.all([
    base("study_book_chapters", "id, titolo, numero, completato_il, ripassi, book_id, study_books!inner(titolo, deleted_at)").is("study_books.deleted_at", null),
    base("study_course_modules", "id, titolo, completato_il, ripassi, course_id, study_courses!inner(titolo, deleted_at)").is("study_courses.deleted_at", null),
    base("study_highlights", "id, testo, pagina, completato_il, ripassi, book_id, course_id, reading_id"),
    base("study_readings", "id, titolo, testata, completato_il, ripassi").is("deleted_at", null),
  ]);
  for (const r of [ch, mo, hi, re]) if (r.error) throw r.error;

  const one = <T,>(v: T | T[]): T => (Array.isArray(v) ? v[0] : v);
  const items: ReviewItem[] = [];
  const push = (key: ReviewItem["key"], id: string, title: string, context: string, completed: string, done: number, href: string) => {
    const due = nextReviewDate(completed, done);
    if (!due) return;
    items.push({ key, id, title, context, due, days: daysUntil(due), step: done + 1, href });
  };

  for (const r of (ch.data ?? []) as unknown as Record<string, unknown>[]) {
    const book = one(r.study_books as { titolo: string } | { titolo: string }[]);
    push("chapters", String(r.id), `${r.numero != null ? `Cap. ${r.numero} · ` : ""}${r.titolo}`, book?.titolo ?? "Libro",
      String(r.completato_il), Number(r.ripassi), detailHref(COLLECTIONS.books, String(r.book_id)));
  }
  for (const r of (mo.data ?? []) as unknown as Record<string, unknown>[]) {
    const course = one(r.study_courses as { titolo: string } | { titolo: string }[]);
    push("modules", String(r.id), String(r.titolo), course?.titolo ?? "Corso", String(r.completato_il), Number(r.ripassi),
      detailHref(COLLECTIONS.courses, String(r.course_id)));
  }
  for (const r of (hi.data ?? []) as unknown as Record<string, unknown>[]) {
    const href = r.book_id
      ? detailHref(COLLECTIONS.books, String(r.book_id))
      : r.course_id
        ? detailHref(COLLECTIONS.courses, String(r.course_id))
        : detailHref(COLLECTIONS.readings, String(r.reading_id));
    const text = String(r.testo);
    push("highlights", String(r.id), text.length > 140 ? `${text.slice(0, 140)}…` : text, r.pagina ? `Highlight · p. ${r.pagina}` : "Highlight",
      String(r.completato_il), Number(r.ripassi), href);
  }
  for (const r of (re.data ?? []) as unknown as Record<string, unknown>[]) {
    push("readings", String(r.id), String(r.titolo), String(r.testata ?? "Lettura"), String(r.completato_il), Number(r.ripassi),
      detailHref(COLLECTIONS.readings, String(r.id)));
  }
  return items.sort((a, b) => a.due.localeCompare(b.due));
}

/* ------------------------------------------------------------------ */
/* Finanze                                                             */
/* ------------------------------------------------------------------ */

export type TxLite = { data: string; tipo: string; importo_cent: number; categoria_id: string | null };

export async function transactionsBetween(from: string, to: string): Promise<TxLite[]> {
  const workspace = await requireOwner();
  const supabase = await hubClient();
  const { data, error } = await supabase
    .from("fin_transactions")
    .select("data, tipo, importo_cent, categoria_id")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .gte("data", from)
    .lte("data", to)
    .limit(20000);
  if (error) throw error;
  return ((data ?? []) as TxLite[]).map((t) => ({ ...t, importo_cent: Number(t.importo_cent) }));
}

export function sumByType(txs: TxLite[]): { entrate: number; uscite: number } {
  let entrate = 0;
  let uscite = 0;
  for (const t of txs) {
    if (t.tipo === "entrata") entrate += t.importo_cent;
    else uscite += t.importo_cent;
  }
  return { entrate, uscite };
}

export function monthBounds(year: number, month: number): { from: string; to: string } {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, "0")}` };
}

/* ------------------------------------------------------------------ */
/* Benessere                                                           */
/* ------------------------------------------------------------------ */

export type NutritionDay = { kcal: number; proteine: number; carboidrati: number; grassi: number };
export type NutritionGoals = { kcal: number | null; proteine: number | null; carboidrati: number | null; grassi: number | null };

export async function nutritionGoals(): Promise<NutritionGoals | null> {
  const workspace = await requireOwner();
  const supabase = await hubClient();
  const { data, error } = await supabase
    .from("nut_goals")
    .select("kcal, proteine, carboidrati, grassi")
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (error) throw error;
  return (data as NutritionGoals | null) ?? null;
}

export type LogEntry = NutritionDay & { id: string; data: string; pasto: string; nome: string; grammi: number };

export async function nutritionLog(from: string, to: string): Promise<LogEntry[]> {
  const workspace = await requireOwner();
  const supabase = await hubClient();
  const { data, error } = await supabase
    .from("nut_log")
    .select("id, data, pasto, nome, grammi, kcal, proteine, carboidrati, grassi")
    .eq("workspace_id", workspace.id)
    .gte("data", from)
    .lte("data", to)
    .order("created_at")
    .limit(5000);
  if (error) throw error;
  return ((data ?? []) as LogEntry[]).map((e) => ({
    ...e,
    grammi: Number(e.grammi),
    kcal: Number(e.kcal),
    proteine: Number(e.proteine),
    carboidrati: Number(e.carboidrati),
    grassi: Number(e.grassi),
  }));
}

export function sumNutrition(entries: NutritionDay[]): NutritionDay {
  const t = { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 };
  for (const e of entries) {
    t.kcal += e.kcal;
    t.proteine += e.proteine;
    t.carboidrati += e.carboidrati;
    t.grassi += e.grassi;
  }
  return t;
}

export type MetricPoint = { data: string; tipo: string; valore: number };

export async function metricsBetween(from: string, to: string): Promise<MetricPoint[]> {
  const workspace = await requireOwner();
  const supabase = await hubClient();
  const { data, error } = await supabase
    .from("health_metrics")
    .select("data, tipo, valore")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .gte("data", from)
    .lte("data", to)
    .order("data")
    .limit(20000);
  if (error) throw error;
  return ((data ?? []) as MetricPoint[]).map((m) => ({ ...m, valore: Number(m.valore) }));
}

export async function latestMetric(tipo: string): Promise<MetricPoint | null> {
  const workspace = await requireOwner();
  const supabase = await hubClient();
  const { data, error } = await supabase
    .from("health_metrics")
    .select("data, tipo, valore")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .eq("tipo", tipo)
    .order("data", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...(data as MetricPoint), valore: Number((data as MetricPoint).valore) } : null;
}

export async function sessionsBetween(from: string, to: string) {
  const workspace = await requireOwner();
  const supabase = await hubClient();
  const { data, error } = await supabase
    .from("wk_sessions")
    .select("id, data, titolo, durata_min, sensazione")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .gte("data", from)
    .lte("data", to)
    .order("data")
    .limit(500);
  if (error) throw error;
  return (data ?? []) as { id: string; data: string; titolo: string; durata_min: number | null; sensazione: number | null }[];
}

/** Lunedì della settimana che contiene `iso`. */
export function mondayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domenica
  return addDays(iso, -((dow + 6) % 7));
}

/* ------------------------------------------------------------------ */
/* Conteggi per i riquadri                                             */
/* ------------------------------------------------------------------ */

export async function countWhere(table: string, filters: Record<string, string | boolean>, trash = true): Promise<number> {
  const workspace = await requireOwner();
  const supabase = await hubClient();
  let q = supabase.from(table).select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id);
  if (trash) q = q.is("deleted_at", null);
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}
