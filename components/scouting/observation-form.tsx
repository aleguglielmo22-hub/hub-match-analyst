"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/archivio/combobox";
import { DraftBanner } from "@/components/forms/draft-banner";
import { useFormDraft } from "@/components/forms/use-form-draft";
import {
  createCompetition,
  createTeam,
  type LookupOption,
} from "@/app/(app)/archivio/actions";
import {
  createObservation,
  createQuickPlayer,
  searchObservationPlayers,
  updateObservation,
  type ObservationPlayer,
} from "@/app/(app)/scouting/osservazioni/actions";
import {
  observationFormSchema,
  todayIso,
  type ObservationFormInput,
  type ObservationFormValues,
} from "@/lib/schemas/observations";
import { RUOLO_LABEL, RUOLO_VALUES, type RuoloEnum } from "@/lib/types/scouting";
import { TONE, ratingTone } from "@/lib/tones";
import { cn } from "@/lib/utils";

function emptyValues(keep?: Partial<ObservationFormInput>): ObservationFormInput {
  return {
    data_osservazione: keep?.data_osservazione ?? todayIso(),
    team_casa_id: keep?.team_casa_id ?? null,
    team_ospite_id: keep?.team_ospite_id ?? null,
    competition_id: keep?.competition_id ?? null,
    ruolo_giocato: null,
    voto: null,
    nota: null,
  };
}

const playerName = (p: ObservationPlayer) => [p.nome, p.cognome].filter(Boolean).join(" ");

/**
 * Osservazione rapida (pensata per il telefono): 1) giocatore, 2) data,
 * partita, ruolo, voto (10 pulsanti) e nota. Bozza automatica e protezione
 * dai doppioni come negli altri form.
 */
export function ObservationForm({
  lookups: initialLookups,
  initialPlayer,
  existing,
  defaultCompetitionId = null,
}: {
  /** Competizione principale dalle preferenze (solo nuove osservazioni). */
  defaultCompetitionId?: string | null;
  lookups: { teams: LookupOption[]; competitions: LookupOption[] };
  /** Giocatore già scelto (es. arrivando dal suo dettaglio). */
  initialPlayer?: ObservationPlayer | null;
  existing?: {
    id: string;
    player: ObservationPlayer;
    values: ObservationFormInput;
    updatedAt: string;
  };
}) {
  const router = useRouter();
  const isEdit = !!existing;
  const [lookups, setLookups] = useState(initialLookups);
  const [player, setPlayer] = useState<ObservationPlayer | null>(
    existing?.player ?? initialPlayer ?? null,
  );
  const [newId, setNewId] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const nextAfterSave = useRef(false);

  const form = useForm<ObservationFormInput, unknown, ObservationFormValues>({
    resolver: zodResolver(observationFormSchema),
    defaultValues: existing?.values ?? {
      ...emptyValues({ competition_id: defaultCompetitionId }),
      ruolo_giocato: initialPlayer?.ruolo_principale ?? null,
    },
  });

  const draft = useFormDraft({
    section: "osservazione",
    itemId: existing?.id ?? null,
    form,
    itemUpdatedAt: existing?.updatedAt,
    newItemId: existing ? undefined : newId,
    onRestoreNewItemId: setNewId,
    extra: existing ? undefined : player,
    onRestoreExtra: existing ? undefined : setPlayer,
  });

  const cancelHref = existing
    ? `/scouting/${existing.player.id}`
    : initialPlayer
      ? `/scouting/${initialPlayer.id}`
      : "/scouting";
  const leave = () => {
    if (draft.confirmLeave()) router.push(cancelHref);
  };

  function choosePlayer(p: ObservationPlayer) {
    setPlayer(p);
    // Ruolo giocato predefinito: il ruolo principale del giocatore.
    if (!form.getValues("ruolo_giocato")) {
      form.setValue("ruolo_giocato", p.ruolo_principale ?? null);
    }
  }

  async function onSubmit(values: ObservationFormValues) {
    // Blocca un secondo invio (doppio clic, Invio) mentre il primo è in corso.
    if (submittingRef.current || !player) return;
    submittingRef.current = true;
    setSubmitting(true);
    const goNext = nextAfterSave.current && !isEdit;
    try {
      if (existing) await updateObservation(existing.id, values);
      else await createObservation(newId, player.id, values);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      toast.error("Salvataggio fallito", { description: message });
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    if (goNext) {
      // Stessa partita, nuovo giocatore: tiene data, squadre e competizione.
      draft.markSaved({ continueEditing: true });
      form.reset(emptyValues(values));
      setPlayer(null);
      setNewId(crypto.randomUUID());
      toast.success(`Osservazione su ${playerName(player)} salvata`, {
        description: "Scegli il prossimo giocatore.",
      });
      submittingRef.current = false;
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    draft.markSaved();
    toast.success(isEdit ? "Modifiche salvate" : "Osservazione salvata");
    router.push(`/scouting/${player.id}`);
    router.refresh();
  }

  const errors = form.formState.errors;
  const saveLabel = isEdit ? "Salva modifiche" : "Salva";

  return (
    <form
      onSubmit={(e) => form.handleSubmit(onSubmit)(e)}
      className="space-y-5 pb-28 md:pb-8"
    >
      <header className="space-y-1">
        <button
          type="button"
          onClick={leave}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground max-md:-ml-2 max-md:min-h-11 max-md:px-2 max-md:text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {isEdit || initialPlayer ? "Torna al giocatore" : "Torna allo Scouting DB"}
        </button>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {isEdit ? "Modifica osservazione" : "Nuova osservazione"}
        </h1>
      </header>

      <DraftBanner
        draft={draft.pending}
        onRestore={draft.restore}
        onDiscard={draft.discard}
      />

      {/* Passo 1: giocatore */}
      <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
        <h2 className="mb-3 text-sm font-semibold tracking-tight">
          <span className="mr-2 text-muted-foreground">1</span>Giocatore
        </h2>
        {player ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-medium">{playerName(player)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[player.ruolo_principale, player.squadra_attuale].filter(Boolean).join(" · ") ||
                  "Profilo da completare"}
              </p>
            </div>
            {!isEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="max-md:min-h-11"
                onClick={() => setPlayer(null)}
              >
                Cambia
              </Button>
            )}
          </div>
        ) : (
          <PlayerPicker onPick={choosePlayer} />
        )}
      </section>

      {/* Passo 2: osservazione */}
      <section
        className={cn(
          "space-y-4 rounded-2xl border border-border/60 bg-card/40 p-5 transition-opacity",
          !player && "pointer-events-none opacity-50",
        )}
        inert={!player}
      >
        <h2 className="text-sm font-semibold tracking-tight">
          <span className="mr-2 text-muted-foreground">2</span>Osservazione
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="data_osservazione">Data</Label>
            <Input id="data_osservazione" type="date" {...form.register("data_osservazione")} />
            <FieldError message={errors.data_osservazione?.message} />
          </div>
          <div className="space-y-2">
            <Label>Competizione</Label>
            <Controller
              control={form.control}
              name="competition_id"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? null}
                  onChange={field.onChange}
                  options={lookups.competitions}
                  placeholder="Cerca o crea…"
                  onCreate={createCompetition}
                  onCreated={(opt) =>
                    setLookups((l) => ({ ...l, competitions: [opt, ...l.competitions] }))
                  }
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Squadra di casa</Label>
            <Controller
              control={form.control}
              name="team_casa_id"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? null}
                  onChange={field.onChange}
                  options={lookups.teams}
                  placeholder="Cerca o crea…"
                  onCreate={createTeam}
                  onCreated={(opt) => setLookups((l) => ({ ...l, teams: [opt, ...l.teams] }))}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Squadra ospite</Label>
            <Controller
              control={form.control}
              name="team_ospite_id"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? null}
                  onChange={field.onChange}
                  options={lookups.teams}
                  placeholder="Cerca o crea…"
                  onCreate={createTeam}
                  onCreated={(opt) => setLookups((l) => ({ ...l, teams: [opt, ...l.teams] }))}
                />
              )}
            />
            <FieldError message={errors.team_ospite_id?.message} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Ruolo giocato</Label>
            <Controller
              control={form.control}
              name="ruolo_giocato"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange((v as RuoloEnum) || null)}
                >
                  <SelectTrigger className="sm:w-72">
                    <SelectValue>
                      {(v: RuoloEnum | "" | null) =>
                        v ? `${v} · ${RUOLO_LABEL[v]}` : "—"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {RUOLO_VALUES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r} · {RUOLO_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Voto globale</Label>
          <Controller
            control={form.control}
            name="voto"
            render={({ field }) => (
              <VotoPicker value={field.value ?? null} onChange={field.onChange} />
            )}
          />
          <FieldError message={errors.voto?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nota">Nota</Label>
          <Textarea
            id="nota"
            rows={4}
            placeholder="Cosa hai visto: punti forti, limiti, contesto…"
            {...form.register("nota")}
          />
          <FieldError message={errors.nota?.message} />
        </div>
      </section>

      {/* Azioni: fisse in basso su mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-border/60 bg-background/95 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur md:static md:z-auto md:justify-end md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button
          type="button"
          variant="ghost"
          className="h-11 px-3 max-md:hidden"
          disabled={submitting}
          onClick={leave}
        >
          <X className="mr-2 h-4 w-4" />
          Annulla
        </Button>
        {!isEdit && (
          // type="button": Invio nei campi corrisponde sempre a "Salva".
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 md:flex-none"
            disabled={submitting || !player}
            onClick={() => {
              nextAfterSave.current = true;
              void form.handleSubmit(onSubmit)();
            }}
          >
            <Plus className="mr-1.5 h-4 w-4 shrink-0" />
            <span className="truncate">
              Salva e osserva un altro<span className="max-sm:hidden"> giocatore</span>
            </span>
          </Button>
        )}
        <Button
          type="submit"
          className="h-11 flex-1 md:flex-none"
          disabled={submitting || !player}
          onClick={() => {
            nextAfterSave.current = false;
          }}
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

/** 10 pulsanti grandi nei colori della scala voti: un tocco sceglie, un altro toglie. */
function VotoPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10" role="radiogroup" aria-label="Voto globale">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? null : n)}
            className={cn(
              "h-12 rounded-xl text-lg font-semibold tabular-nums ring-1 transition-all",
              TONE[ratingTone(n)].badge,
              active
                ? "scale-105 ring-2 ring-foreground"
                : "opacity-70 hover:opacity-100",
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

/** Passo 1: cerca il giocatore o creane uno nuovo con nome, cognome e ruolo. */
function PlayerPicker({ onPick }: { onPick: (p: ObservationPlayer) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ObservationPlayer[] | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    const t = setTimeout(() => {
      searchObservationPlayers(query)
        .then((r) => {
          if (!active) return;
          setResults(r);
          setSearchError(false);
        })
        .catch(() => active && setSearchError(true));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  if (creating) {
    return <QuickPlayerForm onCreated={onPick} onCancel={() => setCreating(false)} />;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome, cognome o squadra…"
          className="h-11 pl-9 text-base"
          autoComplete="off"
          aria-label="Cerca giocatore"
        />
      </div>
      {searchError ? (
        <p className="text-xs text-destructive">Ricerca non riuscita. Riprova.</p>
      ) : results === null ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carico…
        </p>
      ) : (
        <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
          {!query && results.length > 0 && (
            <li className="bg-muted/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Osservati di recente
            </li>
          )}
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{playerName(p)}</span>
                  {p.squadra_attuale && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.squadra_attuale}
                    </span>
                  )}
                </span>
                {p.ruolo_principale && (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {p.ruolo_principale}
                  </span>
                )}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-3 text-sm text-muted-foreground">
              {query ? "Nessun giocatore trovato." : "Nessun giocatore ancora."}
            </li>
          )}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full max-md:min-h-11 sm:w-auto"
        onClick={() => setCreating(true)}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Nuovo giocatore
      </Button>
    </div>
  );
}

function QuickPlayerForm({
  onCreated,
  onCancel,
}: {
  onCreated: (p: ObservationPlayer) => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [ruolo, setRuolo] = useState<RuoloEnum | null>(null);
  const [id] = useState(() => crypto.randomUUID());
  const [isPending, startTransition] = useTransition();
  const canSave = nome.trim() && cognome.trim();

  function create() {
    if (!canSave || isPending) return;
    startTransition(async () => {
      try {
        const p = await createQuickPlayer(id, {
          nome,
          cognome,
          ruolo_principale: ruolo,
        });
        toast.success(`${playerName(p)} aggiunto allo Scouting`, {
          description: "Il resto del profilo si completa dopo.",
        });
        onCreated(p);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error("Giocatore non creato", { description: message });
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-3">
      <p className="text-sm font-medium">Nuovo giocatore</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome"
          aria-label="Nome"
          autoComplete="off"
          enterKeyHint="next"
          className="h-11"
        />
        <Input
          value={cognome}
          onChange={(e) => setCognome(e.target.value)}
          placeholder="Cognome"
          aria-label="Cognome"
          autoComplete="off"
          className="h-11"
          onKeyDown={(e) => {
            // Invio qui crea il giocatore, non invia l'osservazione.
            if (e.key === "Enter") {
              e.preventDefault();
              create();
            }
          }}
        />
        <Select value={ruolo ?? ""} onValueChange={(v) => setRuolo((v as RuoloEnum) || null)}>
          <SelectTrigger className="h-11">
            <SelectValue>{(v: RuoloEnum | "" | null) => (v ? `${v} · ${RUOLO_LABEL[v]}` : "Ruolo")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RUOLO_VALUES.map((r) => (
              <SelectItem key={r} value={r}>
                {r} · {RUOLO_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={create} disabled={!canSave || isPending} className="max-md:min-h-11 max-md:flex-1">
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
          Crea e continua
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending} className="max-md:min-h-11">
          Annulla
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Hai già un profilo completo da creare?{" "}
        <Link href="/scouting/nuovo" className="text-primary hover:underline">
          Scheda completa
        </Link>
      </p>
    </div>
  );
}
