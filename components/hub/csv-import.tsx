"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { aggregate, parseAnyDate, parseCsv, round2, type Aggregation } from "@/lib/hub/csv-parse";
import { eurosToCents, parseDecimal } from "@/lib/hub/fields";
import { METRIC_TYPES } from "@/lib/hub/registry";
import { importMetrics, importTransactions } from "@/app/(app)/hub/import-actions";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const AGGREGATIONS: { value: Aggregation; label: string }[] = [
  { value: "media", label: "media del giorno" },
  { value: "somma", label: "somma del giorno" },
  { value: "ultimo", label: "ultimo valore" },
  { value: "minimo", label: "minimo" },
  { value: "massimo", label: "massimo" },
];
const DEFAULT_AGG: Record<string, Aggregation> = { passi: "somma", calorie_attive: "somma", battito_riposo: "minimo", peso: "ultimo" };

const selectCls = "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm max-md:min-h-11";

/**
 * Importazione da CSV, guidata: scegli il file, indica quali colonne usare,
 * controlla l'anteprima e conferma. Il file resta sul tuo dispositivo: al
 * server arrivano solo i valori già letti.
 */
export function CsvImport({ kind, accounts }: { kind: "metrics" | "transactions"; accounts?: { value: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [dateCol, setDateCol] = useState("");
  // Parametri: colonna e regola per ogni tipo.
  const [mapping, setMapping] = useState<Record<string, { col: string; agg: Aggregation; minutes: boolean }>>({});
  // Movimenti: descrizione, importo con segno oppure due colonne.
  const [descCol, setDescCol] = useState("");
  const [amountMode, setAmountMode] = useState<"signed" | "split">("signed");
  const [amountCol, setAmountCol] = useState("");
  const [inCol, setInCol] = useState("");
  const [outCol, setOutCol] = useState("");
  const [invert, setInvert] = useState(false);
  const [conto, setConto] = useState("");
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
    setDateCol("");
    setMapping({});
    setDescCol("");
    setAmountCol("");
    setInCol("");
    setOutCol("");
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File troppo grande (massimo 10 MB).");
      return;
    }
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      toast.error("Il file non sembra un CSV con dei dati.");
      return;
    }
    setRows(parsed);
    setFileName(file.name);
    // Colonna data indovinata: la prima i cui valori sono date.
    const sample = parsed[1] ?? [];
    const guess = sample.findIndex((c) => parseAnyDate(c));
    setDateCol(guess >= 0 ? String(guess) : "");
  }

  const prepared = useMemo(() => {
    if (!body.length || dateCol === "") return { items: [] as unknown[], bad: 0 };
    const di = Number(dateCol);
    if (kind === "metrics") {
      const groups = new Map<string, number[]>();
      let bad = 0;
      for (const r of body) {
        const d = parseAnyDate(r[di] ?? "");
        if (!d) {
          bad++;
          continue;
        }
        for (const [tipo, m] of Object.entries(mapping)) {
          if (m.col === "") continue;
          let v = parseDecimal(r[Number(m.col)] ?? "");
          if (v === null || v < 0) continue;
          if (m.minutes) v = v / 60;
          const k = `${tipo}|${d}`;
          const list = groups.get(k) ?? [];
          list.push(v);
          groups.set(k, list);
        }
      }
      const items = [...groups.entries()]
        .map(([k, vals]) => {
          const [tipo, data] = k.split("|");
          return { data, tipo, valore: round2(aggregate(vals, mapping[tipo].agg)) };
        })
        .filter((x) => x.valore > 0 || x.tipo === "stress");
      return { items, bad };
    }
    const items: { data: string; descrizione: string; importo_cent: number }[] = [];
    let bad = 0;
    for (const r of body) {
      const d = parseAnyDate(r[di] ?? "");
      const desc = (descCol !== "" ? r[Number(descCol)] : "")?.trim().slice(0, 300) || "Movimento importato";
      let cents: number | null = null;
      if (amountMode === "signed") {
        cents = amountCol !== "" ? eurosToCents(r[Number(amountCol)] ?? "") : null;
        if (cents !== null && invert) cents = -cents;
      } else {
        const inc = inCol !== "" ? eurosToCents(r[Number(inCol)] ?? "") : null;
        const out = outCol !== "" ? eurosToCents(r[Number(outCol)] ?? "") : null;
        if (inc) cents = Math.abs(inc);
        else if (out) cents = -Math.abs(out);
      }
      if (!d || !cents) {
        bad++;
        continue;
      }
      items.push({ data: d, descrizione: desc, importo_cent: cents });
    }
    return { items, bad };
  }, [body, dateCol, kind, mapping, descCol, amountMode, amountCol, inCol, outCol, invert]);

  function runImport() {
    startTransition(async () => {
      const res =
        kind === "metrics" ? await importMetrics(prepared.items) : await importTransactions(prepared.items, conto || null);
      if (!res.ok) return void toast.error(res.message);
      toast.success("Importazione completata", {
        description: `${res.inserted} nuovi${res.updated ? `, ${res.updated} aggiornati` : ""}${res.skipped ? `, ${res.skipped} già presenti o saltati` : ""}.`,
      });
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  const colSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
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
        <FileUp className="mr-1.5 h-4 w-4" />
        {kind === "metrics" ? "Importa da file (Zepp, CSV)" : "Importa estratto conto (CSV)"}
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{kind === "metrics" ? "Importa parametri vitali" : "Importa movimenti"}</DialogTitle>
            <DialogDescription>
              {kind === "metrics"
                ? "Funziona con l'esportazione di Zepp (Profilo → Impostazioni → esporta dati) e con qualsiasi CSV con una colonna data. Il file resta sul tuo dispositivo."
                : "Scarica l'estratto conto in CSV dal sito della banca. Reimportare lo stesso file non crea doppioni. Il file resta sul tuo dispositivo."}
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

              <div className="grid gap-3 sm:grid-cols-2">{colSelect(dateCol, setDateCol, "Colonna con la data")}</div>

              {kind === "metrics" ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Quali colonne importare (lascia “—” per saltare)</p>
                  {METRIC_TYPES.map((t) => {
                    const m = mapping[t.value] ?? { col: "", agg: DEFAULT_AGG[t.value] ?? "media", minutes: false };
                    const set = (patch: Partial<typeof m>) => setMapping((p) => ({ ...p, [t.value]: { ...m, ...patch } }));
                    return (
                      <div key={t.value} className="grid items-end gap-2 rounded-lg border border-border/60 p-2 sm:grid-cols-[1fr_1fr_auto]">
                        {colSelect(m.col, (v) => set({ col: v }), t.label)}
                        <label className="space-y-1 text-xs text-muted-foreground">
                          <span>Se ci sono più valori nello stesso giorno</span>
                          <select value={m.agg} onChange={(e) => set({ agg: e.target.value as Aggregation })} className={selectCls}>
                            {AGGREGATIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                          </select>
                        </label>
                        {t.value === "sonno_ore" ? (
                          <label className="flex min-h-9 items-center gap-1.5 text-xs">
                            <input type="checkbox" checked={m.minutes} onChange={(e) => set({ minutes: e.target.checked })} />
                            È in minuti
                          </label>
                        ) : (
                          <span />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {colSelect(descCol, setDescCol, "Colonna con la descrizione")}
                  <label className="space-y-1 text-xs text-muted-foreground">
                    <span>Come sono scritti gli importi</span>
                    <select value={amountMode} onChange={(e) => setAmountMode(e.target.value as "signed" | "split")} className={selectCls}>
                      <option value="signed">Una colonna (uscite con il meno)</option>
                      <option value="split">Due colonne (entrate e uscite)</option>
                    </select>
                  </label>
                  {amountMode === "signed" ? (
                    <>
                      {colSelect(amountCol, setAmountCol, "Colonna importo")}
                      <label className="flex min-h-9 items-center gap-1.5 self-end text-xs">
                        <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
                        Le uscite sono senza meno (inverti)
                      </label>
                    </>
                  ) : (
                    <>
                      {colSelect(inCol, setInCol, "Colonna entrate (accrediti)")}
                      {colSelect(outCol, setOutCol, "Colonna uscite (addebiti)")}
                    </>
                  )}
                  {accounts && accounts.length > 0 && (
                    <label className="space-y-1 text-xs text-muted-foreground">
                      <span>Conto</span>
                      <select value={conto} onChange={(e) => setConto(e.target.value)} className={selectCls}>
                        <option value="">—</option>
                        {accounts.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
                <p className="text-xs text-muted-foreground">
                  Pronti da importare: <strong className="text-foreground">{prepared.items.length}</strong>
                  {prepared.bad > 0 && ` · ${prepared.bad} righe senza data o importo validi (saltate)`}
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={reset} disabled={isPending}>
                    Cambia file
                  </Button>
                  <Button onClick={runImport} disabled={isPending || prepared.items.length === 0 || prepared.items.length > 5000}>
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
