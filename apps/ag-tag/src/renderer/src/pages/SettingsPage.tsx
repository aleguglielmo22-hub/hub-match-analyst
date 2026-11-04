import { useEffect, useState } from "react";
import { FolderOpen, Keyboard, Moon, RotateCcw, Sun } from "lucide-react";
import type { Settings } from "@shared/api";
import { DEFAULT_SHORTCUTS, PLAYER_ACTIONS, comboLabel, comboOf, conflicts, type PlayerAction } from "@shared/shortcuts";
import { PanelSettings } from "../components/PanelSettings";
import { Button, Card } from "../components/ui";
import { api, cn } from "../lib/api";

/** Cartella delle copie di lavoro, tema, scorciatoie del lettore (salvati sul Mac) e pannello di codifica. */
export function SettingsPage({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [recording, setRecording] = useState<PlayerAction | null>(null);
  const clash = new Set(conflicts(settings.shortcuts).flat());

  // Registrazione di una nuova combinazione: il prossimo tasto premuto (Esc annulla).
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
      if (e.key !== "Escape") {
        void api.settings.setShortcuts({ ...settings.shortcuts, [recording]: comboOf(e) }).then(onChange);
      }
      setRecording(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording, settings.shortcuts, onChange]);

  return (
    <div className="min-h-0 flex-1 overflow-auto px-8 pt-10 pb-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Impostazioni</h1>
      <div className="grid max-w-3xl gap-5">
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold">Copie di lavoro</h2>
          <p className="text-sm text-muted-foreground">
            Cartella per le copie H.264 dei video in formati poco affidabili. Gli originali non vengono mai modificati.
          </p>
          <div className="flex items-center gap-3">
            <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2.5 py-1.5 text-xs" title={settings.cacheDir}>
              {settings.cacheDir}
            </code>
            <Button variant="outline" onClick={() => void api.settings.chooseCacheDir().then(onChange)}>
              <FolderOpen className="h-4 w-4" />
              Cambia
            </Button>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-sm font-semibold">Tema</h2>
          <div className="flex gap-2">
            {(
              [
                { id: "dark", label: "Grafite (scuro)", icon: Moon },
                { id: "light", label: "Carta (chiaro)", icon: Sun },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={settings.theme === t.id}
                onClick={() => void api.settings.setTheme(t.id).then(onChange)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                  settings.theme === t.id ? "border-primary/60 bg-primary-soft text-primary-text" : "border-border hover:bg-muted",
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Keyboard className="h-4 w-4" />
              Scorciatoie del lettore
            </h2>
            <Button variant="ghost" onClick={() => void api.settings.setShortcuts(DEFAULT_SHORTCUTS).then(onChange)}>
              <RotateCcw className="h-4 w-4" />
              Predefinite
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {PLAYER_ACTIONS.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{a.label}</span>
                <button
                  type="button"
                  onClick={() => setRecording(a.id)}
                  className={cn(
                    "min-w-28 rounded-md border px-2.5 py-1 font-mono text-xs",
                    recording === a.id ? "border-primary bg-primary-soft text-primary-text" : "border-border hover:bg-muted",
                    clash.has(a.id) && recording !== a.id && "border-destructive text-destructive",
                  )}
                >
                  {recording === a.id ? "Premi un tasto…" : comboLabel(settings.shortcuts[a.id])}
                </button>
              </li>
            ))}
          </ul>
          {clash.size > 0 && <p className="text-xs text-destructive">Alcune azioni usano la stessa combinazione: cambiane una.</p>}
        </Card>

        <PanelSettings settings={settings} onChange={onChange} />
      </div>
    </div>
  );
}
