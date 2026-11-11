import Link from "next/link";
import { daysUntil, formatDate, formatMoney, todayIso, type Option } from "@/lib/hub/fields";
import { COLLECTIONS, METRIC_TYPES, METRIC_UNIT, detailHref } from "@/lib/hub/registry";
import { hubClient, logSafeError, requireOwner, type Row } from "@/lib/hub/server";
import { SET_COLUMNS, toSetRow } from "@/lib/hub/set-row";
import { previousSets } from "@/lib/hub/summary";
import { estimatedMinutes, parseTemplateSets, personalRecords, totalVolume } from "@/lib/hub/workout";
import { LineChart, ProgressBar } from "./charts";
import { RegisterRecurringButton, SeedExercisesButton, StartSessionButton } from "./action-buttons";
import { WorkoutLogger } from "./workout-logger";
import { TemplateEditor, type EditorItem } from "./template-editor";
import { WorkoutCsvImport } from "./workout-csv-import";
import { CsvImport } from "./csv-import";
import { OffSearch } from "./off-search";

/** Pezzi in più sopra il dettaglio di alcune sezioni. */
export function DetailExtras({
  collectionKey,
  row,
  refOptions,
}: {
  collectionKey: string;
  row: Row;
  refOptions: Record<string, Option[]>;
}) {
  switch (collectionKey) {
    case "templatesWk":
      return <TemplateOverview templateId={row.id} exercises={refOptions.exercises ?? []} />;
    case "sessions":
      return <WorkoutSection row={row} exercises={refOptions.exercises ?? []} />;
    case "recurring": {
      const days = typeof row.prossima_data === "string" ? daysUntil(row.prossima_data) : null;
      return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/40 p-4">
          <p className="flex-1 text-sm">
            Prossima scadenza: <strong>{formatDate(String(row.prossima_data))}</strong>
            {days !== null && (
              <span className="text-muted-foreground"> · {days === 0 ? "oggi" : days > 0 ? `tra ${days} giorni` : `scaduta da ${-days} giorni`}</span>
            )}
          </p>
          <RegisterRecurringButton id={row.id} />
        </div>
      );
    }
    case "goals":
      return (
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <ProgressBar
            value={Number(row.accantonato_cent ?? 0)}
            max={Number(row.obiettivo_cent ?? 0)}
            label={`${formatMoney(Number(row.accantonato_cent ?? 0))} di ${formatMoney(Number(row.obiettivo_cent ?? 0))}`}
          />
        </div>
      );
    case "exams": {
      if (row.stato !== "in_programma") return null;
      const days = daysUntil(String(row.data));
      return (
        <p className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          {days === 0 ? "È oggi!" : days > 0 ? `Mancano ${days} giorni.` : `Era ${-days} giorni fa: aggiorna l'esito.`}
        </p>
      );
    }
    case "courses":
      return <CourseProgress courseId={row.id} />;
    case "books":
      return <BookProgress bookId={row.id} />;
    case "exercises":
      return <ExerciseProgress exerciseId={row.id} />;
    default:
      return null;
  }
}

/** Carica i dati di un riquadro: se qualcosa non va, il riquadro non compare. */
async function safeLoad<T>(label: string, load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (err) {
    logSafeError(label, err);
    return null;
  }
}

async function CourseProgress({ courseId }: { courseId: string }) {
  const data = await safeLoad("Avanzamento corso", async () => {
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const [mods, exams] = await Promise.all([
      supabase.from("study_course_modules").select("stato").eq("workspace_id", workspace.id).eq("course_id", courseId),
      supabase
        .from("study_exams")
        .select("id, titolo, data")
        .eq("workspace_id", workspace.id)
        .eq("course_id", courseId)
        .is("deleted_at", null)
        .eq("stato", "in_programma")
        .gte("data", todayIso())
        .order("data")
        .limit(3),
    ]);
    if (mods.error) throw mods.error;
    if (exams.error) throw exams.error;
    return {
      mods: (mods.data ?? []) as { stato: string }[],
      exams: (exams.data ?? []) as { id: string; titolo: string; data: string }[],
    };
  });
  if (!data) return null;
  const total = data.mods.length;
  const done = data.mods.filter((m) => m.stato === "fatto").length;
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
      {total > 0 ? (
        <ProgressBar value={done} max={total} label={`Lezioni fatte: ${done} di ${total}`} />
      ) : (
        <p className="text-xs text-muted-foreground">Aggiungi le lezioni qui sotto per vedere l&apos;avanzamento.</p>
      )}
      {data.exams.length > 0 && (
        <ul className="space-y-1 text-sm">
          {data.exams.map((e) => (
            <li key={e.id}>
              <Link href={detailHref(COLLECTIONS.exams, e.id)} className="hover:underline">
                {e.titolo}
              </Link>{" "}
              <span className="text-muted-foreground">· {formatDate(e.data)} · tra {daysUntil(e.data)} giorni</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function BookProgress({ bookId }: { bookId: string }) {
  const rows = await safeLoad("Avanzamento libro", async () => {
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data, error } = await supabase.from("study_book_chapters").select("completato_il").eq("workspace_id", workspace.id).eq("book_id", bookId);
    if (error) throw error;
    return (data ?? []) as { completato_il: string | null }[];
  });
  if (!rows || rows.length === 0) return null;
  const done = rows.filter((c) => c.completato_il).length;
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <ProgressBar value={done} max={rows.length} label={`Capitoli completati: ${done} di ${rows.length}`} />
    </div>
  );
}

async function ExerciseProgress({ exerciseId }: { exerciseId: string }) {
  const data = await safeLoad("Progressi esercizio", async () => {
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data, error } = await supabase
      .from("wk_sets")
      .select("carico_kg, ripetizioni, fatta, wk_sessions!inner(data, deleted_at)")
      .eq("workspace_id", workspace.id)
      .eq("exercise_id", exerciseId)
      .is("wk_sessions.deleted_at", null)
      .limit(5000);
    if (error) throw error;
    const rows = (data ?? []) as unknown as {
      carico_kg: number | null;
      ripetizioni: number | null;
      fatta: boolean;
      wk_sessions: { data: string } | { data: string }[];
    }[];
    const best = new Map<string, number>();
    const days = new Set<string>();
    for (const s of rows) {
      const sess = Array.isArray(s.wk_sessions) ? s.wk_sessions[0] : s.wk_sessions;
      if (!sess || !s.fatta) continue;
      days.add(sess.data);
      if (s.carico_kg === null) continue;
      best.set(sess.data, Math.max(best.get(sess.data) ?? 0, Number(s.carico_kg)));
    }
    return {
      points: [...best.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([x, y]) => ({ x, y })),
      records: personalRecords(rows.map((r) => ({ carico_kg: r.carico_kg == null ? null : Number(r.carico_kg), ripetizioni: r.ripetizioni, fatta: r.fatta }))),
      sessions: days.size,
    };
  });
  if (!data) return null;
  const kg = (n: number) => (n > 0 ? `${String(Math.round(n * 10) / 10).replace(".", ",")} kg` : "—");
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Carico massimo" value={kg(data.records.bestWeight)} />
        <Stat label="Massimale stimato" value={kg(data.records.bestOneRepMax)} />
        <Stat label="Miglior serie (volume)" value={kg(data.records.bestVolume)} />
        <Stat label="Allenamenti" value={String(data.sessions)} />
      </div>
      <h2 className="text-sm font-semibold">Carico massimo per allenamento</h2>
      <LineChart points={data.points} unit="kg" label="Carico massimo" />
    </div>
  );
}

const GROUP_LABEL: Record<string, string> = Object.fromEntries(
  (COLLECTIONS.exercises.fields.find((f) => f.key === "gruppo")?.options ?? []).map((o) => [o.value, o.label]),
);

/** Riepilogo di una scheda: quanto dura, cosa allena, quando l'hai fatta l'ultima volta. */
async function TemplateOverview({ templateId, exercises }: { templateId: string; exercises: Option[] }) {
  const data = await safeLoad("Riepilogo scheda", async () => {
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const [items, last, measuresRes] = await Promise.all([
      supabase
        .from("wk_template_items")
        .select("id, exercise_id, ordine, serie, recupero_s, superset, note, dettaglio, wk_exercises(gruppo)")
        .eq("workspace_id", workspace.id)
        .eq("template_id", templateId)
        .order("ordine", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("wk_sessions")
        .select("data")
        .eq("workspace_id", workspace.id)
        .eq("template_id", templateId)
        .is("deleted_at", null)
        .order("data", { ascending: false })
        .limit(200),
      supabase.from("wk_exercises").select("id, misura").eq("workspace_id", workspace.id).is("deleted_at", null).limit(5000),
    ]);
    if (items.error) throw items.error;
    if (last.error) throw last.error;
    if (measuresRes.error) throw measuresRes.error;
    return {
      items: (items.data ?? []) as unknown as {
        id: string;
        exercise_id: string;
        serie: number | null;
        recupero_s: number | null;
        superset: number | null;
        note: string | null;
        dettaglio: unknown;
        wk_exercises: { gruppo: string | null } | { gruppo: string | null }[] | null;
      }[],
      sessions: (last.data ?? []) as { data: string }[],
      measures: Object.fromEntries(((measuresRes.data ?? []) as { id: string; misura: string }[]).map((e) => [e.id, e.misura])),
    };
  });
  const items = data?.items ?? [];
  const groups = new Set<string>();
  for (const it of items) {
    const ex = Array.isArray(it.wk_exercises) ? it.wk_exercises[0] : it.wk_exercises;
    if (ex?.gruppo) groups.add(GROUP_LABEL[ex.gruppo] ?? ex.gruppo);
  }
  const sets = items.reduce((n, it) => n + (it.serie ?? 1), 0);
  const last = data?.sessions[0]?.data;
  const editorItems: EditorItem[] = items.map((it) => {
    const detail = parseTemplateSets(it.dettaglio);
    return {
      id: it.id,
      exercise_id: it.exercise_id,
      recupero_s: it.recupero_s,
      superset: it.superset,
      note: it.note,
      // Senza dettaglio (schede create prima) si parte da un elenco semplice di serie uguali.
      sets: detail.length ? detail : Array.from({ length: Math.max(1, it.serie ?? 1) }, () => ({ t: "normale" as const, rip: null, min: null, max: null, kg: null, dur: null })),
    };
  });
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
        {data && items.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{items.length}</strong> esercizi · <strong className="text-foreground">{sets}</strong> serie · circa{" "}
            <strong className="text-foreground">{estimatedMinutes(items)}</strong> minuti
            {groups.size > 0 && <> · {[...groups].join(", ")}</>}
            {last && (
              <>
                {" "}
                · fatta {data.sessions.length} {data.sessions.length === 1 ? "volta" : "volte"}, ultima il {formatDate(last)}
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Aggiungi gli esercizi qui sotto: serie, ripetizioni, carico e recupero.</p>
        )}
        <StartSessionButton templateId={templateId} />
      </div>
      {data && <TemplateEditor key={templateId} templateId={templateId} items={editorItems} exercises={exercises} measures={data.measures} />}
    </div>
  );
}

/** Allenamento dal vivo: carica le serie, l'ultima volta e come si misura ogni esercizio. */
async function WorkoutSection({ row, exercises }: { row: Row; exercises: Option[] }) {
  const data = await safeLoad("Allenamento", async () => {
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const [setsRes, measuresRes] = await Promise.all([
      supabase
        .from("wk_sets")
        .select(SET_COLUMNS)
        .eq("workspace_id", workspace.id)
        .eq("session_id", row.id)
        .order("ordine", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase.from("wk_exercises").select("id, misura").eq("workspace_id", workspace.id).is("deleted_at", null).limit(5000),
    ]);
    if (setsRes.error) throw setsRes.error;
    if (measuresRes.error) throw measuresRes.error;
    const sets = ((setsRes.data ?? []) as unknown as Record<string, unknown>[]).map(toSetRow);
    const measures = Object.fromEntries(((measuresRes.data ?? []) as { id: string; misura: string }[]).map((e) => [e.id, e.misura]));
    const ids = [...new Set(sets.map((s) => s.exercise_id))];
    const prev = await previousSets(row.id, String(row.data), ids);
    return { sets, prev, measures };
  });
  if (!data) return <p className="text-sm text-muted-foreground">Non è stato possibile caricare le serie. Ricarica la pagina.</p>;
  return (
    <WorkoutLogger
      sessionId={row.id}
      startedAt={String(row.created_at)}
      durationMin={row.durata_min == null ? null : Number(row.durata_min)}
      hasTemplate={!!row.template_id}
      initialSets={data.sets}
      exercises={exercises}
      measures={data.measures}
      previous={data.prev}
    />
  );
}

/** Ultimi 30 giorni di allenamenti: quanti, per quanto tempo, quanto volume. */
async function SessionsOverview({ rows }: { rows: Row[] }) {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const from = todayIsoOf(since);
  const recent = rows.filter((r) => String(r.data) >= from);
  const minutes = recent.reduce((n, r) => n + Number(r.durata_min ?? 0), 0);
  const volume = await safeLoad("Volume allenamenti", async () => {
    if (recent.length === 0) return 0;
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data, error } = await supabase
      .from("wk_sets")
      .select("id, exercise_id, ordine, ripetizioni, carico_kg, fatta")
      .eq("workspace_id", workspace.id)
      .in("session_id", recent.slice(0, 200).map((r) => r.id))
      .limit(10000);
    if (error) throw error;
    return Math.round(
      totalVolume(
        ((data ?? []) as Record<string, unknown>[]).map((r) => ({
          id: String(r.id),
          exercise_id: String(r.exercise_id),
          ordine: null,
          ripetizioni: r.ripetizioni == null ? null : Number(r.ripetizioni),
          carico_kg: r.carico_kg == null ? null : Number(r.carico_kg),
          fatta: r.fatta !== false,
        })),
      ),
    );
  });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Allenamenti negli ultimi 30 giorni" value={String(recent.length)} />
        <Stat label="Tempo in palestra" value={minutes ? (minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`) : "—"} />
        <Stat label="Volume sollevato" value={volume ? `${volume.toLocaleString("it-IT")} kg` : "—"} />
      </div>
      <WorkoutCsvImport />
    </div>
  );
}

function todayIsoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */

/** Pezzi in più sopra la lista di alcune sezioni. */
export function ListExtras({
  collectionKey,
  rows,
  refOptions,
}: {
  collectionKey: string;
  rows: Row[];
  refOptions: Record<string, Option[]>;
}) {
  switch (collectionKey) {
    case "metrics":
      return <MetricsOverview rows={rows} />;
    case "transactions": {
      const month = todayIso().slice(0, 7);
      let entrate = 0;
      let uscite = 0;
      for (const r of rows) {
        if (String(r.data).slice(0, 7) !== month) continue;
        if (r.tipo === "entrata") entrate += Number(r.importo_cent);
        else uscite += Number(r.importo_cent);
      }
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Entrate del mese" value={formatMoney(entrate)} tone="text-tone-success-fg" />
            <Stat label="Uscite del mese" value={formatMoney(uscite)} tone="text-tone-danger-fg" />
            <Stat label="Saldo del mese" value={formatMoney(entrate - uscite)} />
          </div>
          <CsvImport kind="transactions" accounts={refOptions.accounts} />
        </div>
      );
    }
    case "recurring": {
      const perMonth: Record<string, number> = { settimanale: 52 / 12, mensile: 1, bimestrale: 1 / 2, trimestrale: 1 / 3, semestrale: 1 / 6, annuale: 1 / 12 };
      const monthly = rows
        .filter((r) => r.attivo && r.tipo === "uscita")
        .reduce((sum, r) => sum + Number(r.importo_cent) * (perMonth[String(r.frequenza)] ?? 1), 0);
      const subs = rows.filter((r) => r.attivo && r.abbonamento).length;
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Spese fisse al mese (circa)" value={formatMoney(Math.round(monthly))} />
          <Stat label="Abbonamenti attivi" value={String(subs)} />
        </div>
      );
    }
    case "foods":
      return <OffSearch />;
    case "sessions":
      return <SessionsOverview rows={rows} />;
    case "exercises":
      return <SeedExercisesButton />;
    default:
      return null;
  }
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

function MetricsOverview({ rows }: { rows: Row[] }) {
  const byType = new Map<string, { x: string; y: number }[]>();
  for (const r of rows) {
    const list = byType.get(String(r.tipo)) ?? [];
    list.push({ x: String(r.data), y: Number(r.valore) });
    byType.set(String(r.tipo), list);
  }
  const types = METRIC_TYPES.filter((t) => byType.has(t.value));
  return (
    <div className="space-y-4">
      {types.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {types.map((t) => {
            const pts = byType.get(t.value)!.sort((a, b) => a.x.localeCompare(b.x)).slice(-120);
            return (
              <div key={t.value} className="rounded-xl border border-border bg-card/40 p-4">
                <h2 className="mb-2 text-sm font-semibold">{t.label}</h2>
                <LineChart points={pts} unit={METRIC_UNIT[t.value]} label={t.label} height={100} />
              </div>
            );
          })}
        </div>
      )}
      <CsvImport kind="metrics" />
    </div>
  );
}
