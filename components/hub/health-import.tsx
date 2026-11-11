"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addDays, todayIso } from "@/lib/hub/fields";
import { createHealthParser, type HealthRow } from "@/lib/hub/health-xml";
import { METRIC_TYPES } from "@/lib/hub/registry";
import { importMetrics } from "@/app/(app)/hub/import-actions";

const PERIODS = [
  { value: "30", label: "Ultimi 30 giorni" },
  { value: "90", label: "Ultimi 3 mesi" },
  { value: "365", label: "Ultimo anno" },
  { value: "all", label: "Tutto lo storico" },
];
const LABEL = Object.fromEntries(METRIC_TYPES.map((t) => [t.value, t.label]));

/**
 * Importa i parametri dall'esportazione di Apple Salute (dove si sincronizzano
 * anche Zepp e Apple Watch). Il file resta sul tuo dispositivo: al server
 * arrivano solo i valori già calcolati, uno per parametro e giorno.
 */
export function HealthImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("365");
  const [reading, setReading] = useState<string | null>(null);
  const [rows, setRows] = useState<HealthRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setRows(null);
    setReading(null);
    setFileName("");
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setRows(null);
    setFileName(file.name);
    const since = period === "all" ? null : addDays(todayIso(), -Number(period));
    const parser = createHealthParser(since);
    try {
      const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
      let read = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        read += value.length;
        parser.push(value);
        setReading(`Leggo il file… ${Math.min(99, Math.round((read / Math.max(1, file.size)) * 100))}%`);
      }
    } catch {
      setReading(null);
      return void toast.error("Non è stato possibile leggere il file.");
    }
    const result = parser.finish();
    setReading(null);
    if (result.rows.length === 0) return void toast.error("Non ho trovato parametri in questo file e periodo. Hai scelto export.xml?");
    setRows(result.rows);
  }

  const summary = (() => {
    const out = new Map<string, number>();
    for (const r of rows ?? []) out.set(r.tipo, (out.get(r.tipo) ?? 0) + 1);
    return [...out.entries()].sort((a, b) => b[1] - a[1]);
  })();

  function run() {
    if (!rows) return;
    startTransition(async () => {
      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      for (let i = 0; i < rows.length; i += 4000) {
        const res = await importMetrics(rows.slice(i, i + 4000));
        if (!res.ok) return void toast.error(`${res.message}${inserted ? ` (già importati ${inserted} valori)` : ""}`);
        inserted += res.inserted;
        updated += res.updated;
        skipped += res.skipped;
      }
      toast.success("Importazione completata", {
        description: `${inserted} nuovi valori${updated ? `, ${updated} aggiornati` : ""}${skipped ? `, ${skipped} lasciati com'erano (inseriti a mano)` : ""}.`,
      });
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="max-md:min-h-11">
        <HeartPulse className="mr-1.5 h-4 w-4" /> Importa da Apple Salute (anche Zepp)
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Importa da Apple Salute</DialogTitle>
            <DialogDescription>Peso, battito a riposo, sonno, passi, calorie attive, grasso, ossigeno, HRV e pressione: un valore per giorno.</DialogDescription>
          </DialogHeader>

          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Sull&apos;iPhone: app Salute → la tua foto in alto → <strong className="text-foreground">Esporta tutti i dati sanitari</strong>.</li>
            <li>Mandati il file (AirDrop) e fai doppio clic su <strong className="text-foreground">export.zip</strong> sul Mac: si apre la cartella <em>apple_health_export</em>.</li>
            <li>Qui sotto scegli il file <strong className="text-foreground">export.xml</strong> di quella cartella.</li>
          </ol>
          <p className="text-xs text-muted-foreground">Per avere anche i dati di Zepp, in Zepp attiva la sincronizzazione con Apple Salute (Profilo → Account → Salute).</p>

          <label className="space-y-1 text-xs text-muted-foreground">
            <span>Periodo da importare</span>
            <select value={period} onChange={(e) => { setPeriod(e.target.value); reset(); }} className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground max-md:min-h-11">
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          {!rows && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground hover:bg-muted/30">
              {reading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
              {reading ?? "Scegli export.xml"}
              <input type="file" accept=".xml,text/xml,application/xml" className="sr-only" disabled={!!reading} onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          )}

          {rows && (
            <div className="space-y-3">
              <p className="text-sm">
                <strong>{fileName}</strong>: trovati <strong>{rows.length}</strong> valori, dal {rows[0].data} al {rows[rows.length - 1].data}.
              </p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {summary.map(([tipo, n]) => (
                  <li key={tipo}>
                    {LABEL[tipo] ?? tipo}: <strong className="text-foreground">{n}</strong> giorni
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Un giorno già presente viene aggiornato, tranne i valori che hai scritto tu a mano.</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={reset} disabled={isPending}>
                  Cambia file
                </Button>
                <Button onClick={run} disabled={isPending}>
                  {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Importa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
