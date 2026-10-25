"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  Smartphone,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { humanFileSize } from "@/lib/attachments/shared";
import { getLastBackup, setLastBackup } from "@/lib/backup/last-backup";
import {
  prepareBackup,
  runBackup,
  type BackupPlan,
  type BackupProgress,
  type BackupResult,
} from "@/lib/backup/run-backup";

type State =
  | { kind: "preparing" }
  | { kind: "prepare-error"; message: string }
  | { kind: "ready" }
  | { kind: "running"; progress: BackupProgress }
  | { kind: "done"; result: BackupResult }
  | { kind: "error"; message: string };

function isSmartphone(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  if (nav.userAgentData?.mobile) return true;
  return /Android.+Mobile|iPhone|iPod|Windows Phone|Mobile Safari/i.test(nav.userAgent);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Lasciamo al browser il tempo di avviare il salvataggio prima di liberare la memoria.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Pannello "Scarica backup": stima, opzione file, avanzamento ed esito.
 * Tutto il lavoro avviene nel browser (vedi lib/backup/run-backup.ts).
 */
export function BackupPanel({ appVersion }: { appVersion: string }) {
  const [state, setState] = useState<State>({ kind: "preparing" });
  const [plan, setPlan] = useState<BackupPlan | null>(null);
  const [includeFiles, setIncludeFiles] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [lastBackup, setLastBackupState] = useState<Date | null>(null);
  const [lastResult, setLastResult] = useState<BackupResult | null>(null);

  async function prepare() {
    setState({ kind: "preparing" });
    try {
      setPlan(await prepareBackup());
      setState({ kind: "ready" });
    } catch (err) {
      setState({
        kind: "prepare-error",
        message: err instanceof Error ? err.message : "Errore sconosciuto",
      });
    }
  }

  useEffect(() => {
    // Lettura di valori disponibili solo nel browser, una volta al montaggio.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobile(isSmartphone());
    setLastBackupState(getLastBackup());
    void prepare();
  }, []);

  useEffect(() => {
    if (state.kind !== "running") return;
    // Avvisa se si chiude la pagina mentre il backup è in corso.
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [state.kind]);

  async function start() {
    if (!plan) return;
    try {
      const result = await runBackup(plan, {
        includeFiles,
        appVersion,
        onProgress: (progress) => setState({ kind: "running", progress }),
      });
      downloadBlob(result.blob, result.filename);
      // Il promemoria si azzera solo se tutte le tabelle sono state lette.
      if (result.tableErrors === 0) {
        const now = new Date();
        setLastBackup(now);
        setLastBackupState(now);
      }
      // Il blob è già passato al download: non lo teniamo in memoria nello stato.
      setLastResult({ ...result, blob: new Blob() });
      setState({ kind: "done", result });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Errore sconosciuto",
      });
    }
  }

  const running = state.kind === "running";
  const filesCount = plan?.files.length ?? 0;
  const unregistered = plan?.files.filter((f) => !f.registered).length ?? 0;
  const estimate = plan
    ? plan.estimatedDataBytes + (includeFiles ? plan.filesBytes : 0)
    : 0;

  return (
    <section className="space-y-5 rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
      <header className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">Scarica backup</h2>
        <p className="text-sm text-muted-foreground">
          Un unico file ZIP con tutti i tuoi dati (anche le voci nel cestino) e,
          se vuoi, i file caricati. Conservalo fuori dal computer.
        </p>
        <p className="text-xs text-muted-foreground">
          Ultimo backup su questo dispositivo:{" "}
          <span className="font-medium text-foreground">
            {lastBackup ? lastBackup.toLocaleString("it-IT") : "mai"}
          </span>
        </p>
      </header>

      {state.kind === "preparing" && (
        <p className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calcolo della dimensione in corso…
        </p>
      )}

      {state.kind === "prepare-error" && (
        <div className="space-y-3">
          <p className="flex items-start gap-2 text-sm text-destructive">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Impossibile preparare il backup: {state.message}
          </p>
          <Button variant="outline" className="h-11 px-4" onClick={() => void prepare()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Riprova
          </Button>
        </div>
      )}

      {plan && state.kind !== "preparing" && state.kind !== "prepare-error" && (
        <>
          <label
            htmlFor="backup-include-files"
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-card/30 px-3 py-2"
          >
            <Checkbox
              id="backup-include-files"
              checked={includeFiles}
              disabled={running}
              onCheckedChange={(v) => setIncludeFiles(v === true)}
            />
            <span className="text-sm">
              Includi i file caricati
              <span className="block text-xs text-muted-foreground">
                {filesCount} file · {humanFileSize(plan.filesBytes) || "0 B"}
                {unregistered > 0 && ` (di cui ${unregistered} non registrati)`}
              </span>
            </span>
          </label>

          {includeFiles && mobile && (
            <p className="flex items-start gap-2 rounded-lg border border-tone-warning/40 bg-tone-warning-soft text-tone-warning-fg px-3 py-2 text-sm">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
              Consigliato da computer: il telefono potrebbe non avere memoria
              sufficiente
            </p>
          )}

          <p className="text-sm">
            Dimensione stimata:{" "}
            <span className="font-semibold">circa {humanFileSize(estimate)}</span>
          </p>

          {state.kind === "running" && <ProgressBox progress={state.progress} />}

          <Button
            size="lg"
            className="h-11 w-full px-4 sm:w-auto"
            disabled={running}
            onClick={() => void start()}
          >
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Backup in corso… non chiudere la pagina
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Scarica backup
              </>
            )}
          </Button>
        </>
      )}

      {state.kind === "done" && <ResultBox result={state.result} />}
      {state.kind === "ready" && lastResult && <ResultBox result={lastResult} />}

      {state.kind === "error" && (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Backup non riuscito: {state.message}. Nessun file è stato scaricato.
        </p>
      )}
    </section>
  );
}

function ProgressBox({ progress: p }: { progress: BackupProgress }) {
  const total = p.tablesTotal + p.filesTotal;
  const done = p.tablesDone + p.filesDone;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-2" aria-live="polite">
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          Tabelle {p.tablesDone}/{p.tablesTotal}
        </span>
        {p.filesTotal > 0 && (
          <span>
            File {p.filesDone}/{p.filesTotal}
          </span>
        )}
        {p.phase === "zip" && <span>Creazione dello ZIP…</span>}
      </p>
    </div>
  );
}

function ResultBox({ result: r }: { result: BackupResult }) {
  const complete = r.tableErrors === 0 && r.filesFailed === 0;
  const Icon = complete ? CheckCircle2 : AlertTriangle;
  return (
    <div
      className={
        complete
          ? "flex items-start gap-2 rounded-lg border border-tone-success/40 bg-tone-success-soft text-tone-success-fg px-3 py-2 text-sm"
          : "flex items-start gap-2 rounded-lg border border-tone-warning/40 bg-tone-warning-soft text-tone-warning-fg px-3 py-2 text-sm"
      }
      role="status"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">
          {complete
            ? "Backup completato e scaricato."
            : "Backup scaricato, ma incompleto."}
        </p>
        <p className="break-all text-xs opacity-90">{r.filename}</p>
        {r.tableErrors > 0 && (
          <p className="text-xs">
            {r.tableErrors} tabelle non lette: il promemoria in Dashboard resta
            attivo. Riprova più tardi.
          </p>
        )}
        {r.filesFailed > 0 && (
          <p className="text-xs">
            {r.filesFailed} file non scaricati (motivi in manifest.json).
          </p>
        )}
        {r.manifest.file_inclusi && (
          <p className="text-xs">{r.filesOk} file inclusi.</p>
        )}
      </div>
    </div>
  );
}
