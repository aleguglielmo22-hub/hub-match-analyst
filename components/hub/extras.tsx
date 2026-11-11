import Link from "next/link";
import { daysUntil, formatDate, formatMoney, todayIso, type Option } from "@/lib/hub/fields";
import { COLLECTIONS, METRIC_TYPES, METRIC_UNIT, detailHref } from "@/lib/hub/registry";
import { hubClient, logSafeError, requireOwner, type Row } from "@/lib/hub/server";
import { LineChart, ProgressBar } from "./charts";
import { RegisterRecurringButton, StartSessionButton } from "./action-buttons";
import { CsvImport } from "./csv-import";
import { OffSearch } from "./off-search";

/** Pezzi in più sopra il dettaglio di alcune sezioni. */
export function DetailExtras({
  collectionKey,
  row,
}: {
  collectionKey: string;
  row: Row;
  refOptions: Record<string, Option[]>;
}) {
  switch (collectionKey) {
    case "templatesWk":
      return (
        <div>
          <StartSessionButton templateId={row.id} />
        </div>
      );
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
  const points = await safeLoad("Progressi esercizio", async () => {
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data, error } = await supabase
      .from("wk_sets")
      .select("carico_kg, wk_sessions!inner(data, deleted_at)")
      .eq("workspace_id", workspace.id)
      .eq("exercise_id", exerciseId)
      .is("wk_sessions.deleted_at", null)
      .limit(2000);
    if (error) throw error;
    const best = new Map<string, number>();
    for (const s of (data ?? []) as unknown as { carico_kg: number | null; wk_sessions: { data: string } | { data: string }[] }[]) {
      const sess = Array.isArray(s.wk_sessions) ? s.wk_sessions[0] : s.wk_sessions;
      if (!sess || s.carico_kg === null) continue;
      best.set(sess.data, Math.max(best.get(sess.data) ?? 0, Number(s.carico_kg)));
    }
    return [...best.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([x, y]) => ({ x, y }));
  });
  if (!points) return null;
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <h2 className="mb-2 text-sm font-semibold">Carico massimo per allenamento</h2>
      <LineChart points={points} unit="kg" label="Carico massimo" />
    </div>
  );
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
