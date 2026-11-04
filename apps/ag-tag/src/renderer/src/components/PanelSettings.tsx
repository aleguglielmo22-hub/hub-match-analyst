import { useEffect, useState } from "react";
import { AlertTriangle, Check, FileUp, LayoutGrid, Loader2, X } from "lucide-react";
import type { PanelImportResult, Settings } from "@shared/api";
import { FAMILIES, findEvent, type Panel } from "@shared/panel";
import { eventKeyConflicts } from "@shared/panel-shortcuts";
import { comboLabel, comboOf } from "@shared/shortcuts";
import { api, cn, errorMessage } from "../lib/api";
import { Button, Card, ErrorBox } from "./ui";

const familyLabel = (id: string) => FAMILIES.find((f) => f.id === id)?.label ?? id;
const secs = (ms: number) => String(ms / 1000).replace(".", ",");

/** Impostazioni del pannello: importazione da VideoMatch/LiveTag, anticipo e coda, lettere degli eventi. */
export function PanelSettings({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [preview, setPreview] = useState<Extract<PanelImportResult, { ok: true }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<string | null>(null);

  useEffect(() => {
    void api.panel.get().then(setPanel);
  }, []);

  // Nuova lettera per un evento: il prossimo tasto premuto (Esc annulla).
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
      if (e.key !== "Escape") void api.settings.setEventKeys({ ...settings.eventKeys, [recording]: comboOf(e) }).then(onChange);
      setRecording(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording, settings.eventKeys, onChange]);

  async function pick() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.panel.pickImport();
      if (!res) return;
      if (res.ok) setPreview(res);
      else setError(res.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!preview) return;
    try {
      const res = await api.panel.confirmImport(preview.token);
      setPanel(res.panel);
      onChange(res.settings);
      setPreview(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function setTiming(code: string, field: "leadMs" | "lagMs", raw: string) {
    if (!panel) return;
    const ev = findEvent(panel, code);
    const n = Number(raw.replace(",", "."));
    if (!ev || !Number.isFinite(n)) return;
    const ms = Math.round(Math.max(0, Math.min(60, n)) * 1000);
    try {
      setPanel(await api.panel.setTiming(code, field === "leadMs" ? ms : ev.leadMs, field === "lagMs" ? ms : ev.lagMs));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const codes = panel?.events.map((e) => e.code) ?? [];
  const clashes = eventKeyConflicts(settings.eventKeys, codes, settings.shortcuts);
  const clash = new Set(clashes.map((c) => c.code));

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <LayoutGrid className="h-4 w-4" />
          Pannello di codifica
        </h2>
        <Button variant="outline" onClick={() => void pick()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          Importa da VideoMatch…
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Scegli il file <span className="font-medium text-foreground">.xml</span> di VideoMatch e, tenendo premuto ⌘, anche il{" "}
        <span className="font-medium text-foreground">.json</span> di LiveTag dello stesso pannello: da LiveTag arrivano i nomi dei
        gruppi, l'anticipo e la coda. I file restano sul Mac.
      </p>
      <p className="text-xs text-muted-foreground">
        Anteprima: il pannello resta in uso fino alla chiusura di AG Tag; verrà salvato nel database con il prossimo aggiornamento.
      </p>

      {error && <ErrorBox>{error}</ErrorBox>}

      {preview && (
        <div className="space-y-3 rounded-xl border border-primary/50 p-4">
          <p className="text-sm font-medium">
            Anteprima: {preview.preview.panel.events.length} eventi da «{preview.preview.sources.videomatch}»
            {preview.preview.sources.livetag && <> e «{preview.preview.sources.livetag}»</>}
          </p>
          {preview.preview.warnings.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {preview.preview.warnings.map((w) => (
                <li key={w} className="flex gap-1.5">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          )}
          <div className="max-h-96 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-card text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Evento</th>
                  <th className="px-2 py-1.5 font-medium">Tasto</th>
                  <th className="px-2 py-1.5 font-medium">Specchio</th>
                  <th className="px-2 py-1.5 font-medium">Anticipo / coda</th>
                  <th className="px-2 py-1.5 font-medium">Gruppi (singola · multipla)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.preview.panel.events.map((e) => (
                  <tr key={e.code} className="align-top">
                    <td className="px-2 py-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-1 rounded-full" style={{ background: e.color }} aria-hidden />
                        <span className="font-medium">{e.name}</span>
                      </span>
                      <span className="text-muted-foreground">
                        {e.code} · {familyLabel(e.family)}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 font-mono">{preview.preview.keys[e.code] ? comboLabel(preview.preview.keys[e.code]) : "—"}</td>
                    <td className="px-2 py-1.5">{e.mirrorCode ? findEvent(preview.preview.panel, e.mirrorCode)?.name : "nessuno"}</td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {secs(e.leadMs)} s / {secs(e.lagMs)} s
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {e.groups.own.map((g) => `${g.name} (${g.labels.length}${g.selection === "multi" ? ", multipla" : ""})`).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Ogni evento avrà due set di sottotag, uno per la tua squadra e uno per l'avversaria, all'inizio identici.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => void confirm()}>
              <Check className="h-4 w-4" />
              Usa questo pannello
            </Button>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              <X className="h-4 w-4" />
              Annulla
            </Button>
          </div>
        </div>
      )}

      {panel && !preview && (
        <div className="space-y-2">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1.5 font-medium">Evento</th>
                <th className="py-1.5 font-medium">Anticipo (s)</th>
                <th className="py-1.5 font-medium">Coda (s)</th>
                <th className="py-1.5 font-medium">Tasto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {panel.events.map((e) => (
                <tr key={e.code}>
                  <td className="py-1.5 pr-2">
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-1 rounded-full" style={{ background: e.color }} aria-hidden />
                      {e.name}
                    </span>
                  </td>
                  {(["leadMs", "lagMs"] as const).map((f) => (
                    <td key={f} className="py-1.5 pr-2">
                      <input
                        key={`${e.code}-${f}-${e[f]}`}
                        type="number"
                        min={0}
                        max={60}
                        step={0.5}
                        defaultValue={e[f] / 1000}
                        aria-label={`${f === "leadMs" ? "Anticipo" : "Coda"} di ${e.name}, in secondi`}
                        onBlur={(ev) => void setTiming(e.code, f, ev.target.value)}
                        className="h-8 w-20 rounded-md border border-input bg-card px-2 text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                      />
                    </td>
                  ))}
                  <td className="py-1.5">
                    <button
                      type="button"
                      onClick={() => setRecording(e.code)}
                      className={cn(
                        "min-w-24 rounded-md border px-2.5 py-1 font-mono text-xs",
                        recording === e.code ? "border-primary bg-primary-soft text-primary-text" : "border-border hover:bg-muted",
                        clash.has(e.code) && recording !== e.code && "border-destructive text-destructive",
                      )}
                    >
                      {recording === e.code ? "Premi un tasto…" : settings.eventKeys[e.code] ? comboLabel(settings.eventKeys[e.code]) : "—"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clashes.length > 0 && (
            <ul className="text-xs text-destructive">
              {clashes.map((c) => (
                <li key={`${c.code}-${c.with}`}>
                  {findEvent(panel, c.code)?.name}: stesso tasto di {findEvent(panel, c.with)?.name ?? `«${c.with}» del lettore`}.
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
