"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/archivio/combobox";
import {
  createCompetition,
  createSeason,
  createTeam,
} from "@/app/(app)/archivio/actions";
import {
  saveMyPreferences,
  type SharedLookups,
  type WorkPreferences,
} from "@/app/(app)/lookups/actions";

/** Preferenze di lavoro: valori predefiniti dei form nuovi. */
export function PreferencesForm({
  initial,
  lookups: initialLookups,
}: {
  initial: WorkPreferences;
  lookups: SharedLookups;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [lookups, setLookups] = useState(initialLookups);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        await saveMyPreferences(prefs);
        toast.success("Preferenze salvate");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error("Salvataggio non riuscito", { description: message });
      }
    });
  }

  return (
    <section className="space-y-5 rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>La mia squadra</Label>
          <Combobox
            value={prefs.my_team_id}
            onChange={(v) => setPrefs((p) => ({ ...p, my_team_id: v }))}
            options={lookups.teams}
            placeholder="Nessuna"
            onCreate={createTeam}
            onCreated={(opt) => setLookups((l) => ({ ...l, teams: [opt, ...l.teams] }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Stagione corrente</Label>
          <Combobox
            value={prefs.current_season_id}
            onChange={(v) => setPrefs((p) => ({ ...p, current_season_id: v }))}
            options={lookups.seasons}
            placeholder="Nessuna"
            onCreate={createSeason}
            onCreated={(opt) => setLookups((l) => ({ ...l, seasons: [opt, ...l.seasons] }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Competizione principale</Label>
          <Combobox
            value={prefs.main_competition_id}
            onChange={(v) => setPrefs((p) => ({ ...p, main_competition_id: v }))}
            options={lookups.competitions}
            placeholder="Nessuna"
            onCreate={createCompetition}
            onCreated={(opt) =>
              setLookups((l) => ({ ...l, competitions: [opt, ...l.competitions] }))
            }
          />
        </div>
      </div>

      <ul className="space-y-1 text-xs text-muted-foreground">
        <li>· Set Pieces: la mia squadra è l&apos;esecutrice nei piazzati offensivi e l&apos;avversaria nei difensivi.</li>
        <li>· Set Pieces e Cloud: stagione corrente, competizione principale e data di oggi.</li>
        <li>· Cloud: la mia squadra come squadra principale; ambito e categoria ricordano l&apos;ultima scelta.</li>
        <li>· Osservazioni: competizione principale.</li>
      </ul>

      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={isPending} className="max-md:min-h-11">
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salva preferenze
        </Button>
      </div>
    </section>
  );
}
