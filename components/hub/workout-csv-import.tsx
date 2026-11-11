"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseAnyDate, parseCsv } from "@/lib/hub/csv-parse";
import { parseDecimal } from "@/lib/hub/fields";
import { chunkSessions, groupWorkoutRows, lbToKg, type WorkoutRow } from "@/lib/hub/workout-import";
import { importWorkouts } from "@/app/(app)/hub/workout-actions";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const selectCls = "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm max-md:min-h-11";

/** Indovina una colonna dal nome (italiano o inglese). */
function guess(header: string[], names: string[]): string {
  const i = header.findIndex((h) => names.some((n) => h.toLowerCase().includes(n)));
  return i >= 0 ? String(i) : "";
}

/**
 * Importa lo storico degli allenamenti da un CSV (Lyfta, Hevy, Strong o
 * qualsiasi altro file con data, esercizio, peso e ripetizioni). Il file
 * resta sul tuo dispositivo: al server arrivano solo le serie già lette.
 */
export function WorkoutCsvImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [cols, setCols] = useState({ date: "", title: "", exercise: "", weight: "", reps: "" });
  const [lbs, setLbs] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const header = useMemo(() => {
    if (!rows?.length) return [];
    const width = Math.max(...rows.slice(0, 20).map((r) => r.length));
    return Array.from({ length: width }, (_, i) => (hasHeader ? rows[0][i] || `Colonna ${i + 1}` : `Colonna ${i + 1}`));
  }, [rows, hasHeader]);
  const body = useMemo(() => (rows ? (hasHeader ? rows.slice(1) : rows) : []), [rows, hasHeader]);

  function reset() {
    setRows(null);
    setFileName("");
    setCols({ date: "", title: "", exercise: "", weight: "", reps: "" });
    setProgress(null);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return void toast.error("File troppo grande (massimo 15 MB).");
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) return void toast.error("Il file non sembra un CSV con dei dati.");
    const head = parsed[0];
    setRows(parsed);
    setFileName(file.name);
    setCols({
      date: guess(head, ["date", "data", "start"]),
      title: guess(head, ["workout", "title", "routine", "allenamento", "nome allen"]),
      exercise: guess(head, ["exercise", "esercizio"]),
      weight: guess(head, ["weight", "peso", "kg", "carico"]),
      reps: guess(head, ["reps", "ripet"]),
    });
  }

  const prepared = useMemo(() => {
    const out: WorkoutRow[] = [];
    let bad = 0;
    if (cols.date === "" || cols.exercise === "") return { out, bad };
    for (const r of body) {
      const data = parseAnyDate(r[Number(cols.date)] ?? "");
      const esercizio = (r[Number(cols.exercise)] ?? "").trim().slice(0, 120);
      if (!data || !esercizio) {
        bad++;
        continue;
      }
      const titolo = (cols.title !== "" ? (r[Number(cols.title)] ?? "").trim() : "").slice(0, 200) || "Allenamento";
      let kg = cols.weight !== "" ? parseDecimal(r[Number(cols.weight)] ?? "") : null;
      if (kg !== null) kg = lbs ? lbToKg(kg) : Math.round(kg * 100) / 100;
      if (kg !== null && (kg < 0 || kg > 1000)) kg = null;
      let reps = cols.reps !== "" ? parseDecimal(r[Number(cols.reps)] ?? "") : null;
      if (reps !== null) reps = reps < 0 || reps > 1000 ? null : Math.round(reps);
      out.push({ data, titolo, esercizio, ripetizioni: reps, carico_kg: kg });
    }
    return { out, bad };
  }, [body, cols, lbs]);

  const groups = useMemo(() => groupWorkoutRows(prepared.out), [prepared.out]);

  function run() {
    startTransition(async () => {
      const chunks = chunkSessions(groups, 1500);
      let sessions = 0;
      let sets = 0;
      let skipped = 0;
      let created = 0;
      for (let i = 0; i < chunks.length; i++) {
        setProgress(`Importo… ${i + 1} di ${chunks.length}`);
        const res = await importWorkouts(chunks[i].flatMap((g) => g.sets));
        if (!res.ok) {
          setProgress(null);
          return void toast.error(`${res.message}${sessions ? ` (già importati ${sessions} allenamenti)` : ""}`);
        }
        sessions += res.sessions;
        sets += res.sets;
        skipped += res.skipped;
        created += res.newExercises;
      }
      setProgress(null);
      toast.success("Importazione completata", {
        description: `${sessions} allenamenti e ${sets} serie${created ? `, ${created} nuovi esercizi` : ""}${skipped ? `, ${skipped} già presenti (saltati)` : ""}.`,
      });
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  const colSelect = (value: string, onChange: (v: string) => void, label: string, optional = false) => (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span>
        {label}
        {optional ? " (facoltativa)" : ""}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        <option value="">—</option>
        {header.map((h, i) => (
          <option key={i} value={String(i)}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="max-md:min-h-11">
        <FileUp className="mr-1.5 h-4 w-4" /> Importa lo storico da file (Lyfta, Hevy, CSV)
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importa allenamenti</DialogTitle>
            <DialogDescription>
              Serve un CSV con una riga per serie: data, esercizio, peso e ripetizioni. Gli esercizi che non hai ancora vengono creati; un allenamento con la stessa data e lo stesso titolo di uno già presente viene saltato.
            </DialogDescription>
          </DialogHeader>

          {!rows ? (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground hover:bg-muted/30">
              <Upload className="h-6 w-6" />
              Scegli un file .csv
              <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="truncate text-muted-foreground">
                  {fileName} · {body.length} righe
                </span>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
                  La prima riga contiene i nomi delle colonne
                </label>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr>{header.map((h, i) => <th key={i} className="whitespace-nowrap px-2 py-1 text-left font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {body.slice(0, 4).map((r, i) => (
                      <tr key={i} className="border-t border-border/60">
                        {header.map((_, j) => <td key={j} className="whitespace-nowrap px-2 py-1">{r[j] ?? ""}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {colSelect(cols.date, (v) => setCols((c) => ({ ...c, date: v })), "Colonna con la data")}
                {colSelect(cols.exercise, (v) => setCols((c) => ({ ...c, exercise: v })), "Colonna con l'esercizio")}
                {colSelect(cols.title, (v) => setCols((c) => ({ ...c, title: v })), "Colonna con il nome dell'allenamento", true)}
                {colSelect(cols.weight, (v) => setCols((c) => ({ ...c, weight: v })), "Colonna con il peso", true)}
                {colSelect(cols.reps, (v) => setCols((c) => ({ ...c, reps: v })), "Colonna con le ripetizioni", true)}
                <label className="flex min-h-9 items-center gap-2 self-end text-xs">
                  <input type="checkbox" checked={lbs} onChange={(e) => setLbs(e.target.checked)} />
                  I pesi sono in libbre (li converto in kg)
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
                <p className="text-xs text-muted-foreground">
                  Pronti: <strong className="text-foreground">{groups.length}</strong> allenamenti, <strong className="text-foreground">{prepared.out.length}</strong> serie
                  {prepared.bad > 0 && ` · ${prepared.bad} righe senza data o esercizio (saltate)`}
                  {progress && ` · ${progress}`}
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={reset} disabled={isPending}>
                    Cambia file
                  </Button>
                  <Button onClick={run} disabled={isPending || prepared.out.length === 0}>
                    {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    Importa
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
