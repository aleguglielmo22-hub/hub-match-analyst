"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  emptyPlayerForm,
  playerFormSchema,
  type PlayerFormValues,
} from "@/lib/schemas/scouting";
import {
  FASCIA_INGAGGIO_LABEL,
  FASCIA_INGAGGIO_VALUES,
  GESTI_MOTORI_LABEL,
  GESTI_MOTORI_VALUES,
  INFLUENZE_NEG,
  MUSCOLATURA_LABEL,
  MUSCOLATURA_VALUES,
  PASSAPORTO_LABEL,
  PASSAPORTO_VALUES,
  PIEDE_LABEL,
  PIEDE_VALUES,
  RATING_AREA_LABEL,
  RATING_AREA_MACRO,
  RATING_MACRO_LABEL,
  RATINGS,
  RUOLO_GRUPPI,
  RUOLO_LABEL,
  RUOLO_VALUES,
  SI_NO_AVOLTE_LABEL,
  SI_NO_AVOLTE_VALUES,
  STATUS_OSSERVAZIONE_LABEL,
  STATUS_OSSERVAZIONE_VALUES,
  STRUTTURA_CORPOREA_LABEL,
  STRUTTURA_CORPOREA_VALUES,
  VOTO_POTENZIALE_LABEL,
  VOTO_POTENZIALE_VALUES,
  type RatingArea,
  type RatingDef,
  type RatingKey,
  type RatingMacroGroup,
  type RuoloEnum,
} from "@/lib/types/scouting";
import { createPlayer, updatePlayer } from "@/app/(app)/scouting/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
      <header className="mb-5">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
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

/** Input a chip libero per stili di gioco. */
function FreeChipInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  function commit() {
    const t = draft.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setDraft("");
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            aria-label={`Rimuovi ${t}`}
            className="rounded-sm hover:bg-primary/20"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={value.length === 0 ? placeholder : ""}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

function RuoliSecondariToggle({
  value,
  onChange,
  primario,
}: {
  value: RuoloEnum[];
  onChange: (next: RuoloEnum[]) => void;
  primario: RuoloEnum | null | undefined;
}) {
  function toggle(v: RuoloEnum) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }
  return (
    <div className="space-y-2">
      {RUOLO_GRUPPI.map((gruppo) => (
        <div key={gruppo.label} className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {gruppo.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {gruppo.values.map((v) => {
              const active = value.includes(v);
              const disabled = v === primario;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(v)}
                  aria-pressed={active}
                  title={RUOLO_LABEL[v]}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] font-mono font-semibold transition-colors",
                    disabled
                      ? "border-border/40 bg-muted/30 text-muted-foreground/40 line-through"
                      : active
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border bg-transparent text-muted-foreground hover:border-border/80 hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoUrlList({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const t = draft.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setDraft("");
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://… (link Wyscout, YouTube, MP4…)"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Aggiungi
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((url, i) => (
            <li
              key={url}
              className="flex items-center gap-2 rounded-md border border-border/50 bg-card/30 px-3 py-2"
            >
              <span className="text-[10px] font-semibold text-muted-foreground">
                #{i + 1}
              </span>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-xs text-foreground/80 hover:text-primary"
                title={url}
              >
                {url}
              </a>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
              <button
                type="button"
                aria-label="Rimuovi clip"
                onClick={() => onChange(value.filter((u) => u !== url))}
                className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Mini-input numerico 1-10 con etichetta.
 * Usato per le 71 valutazioni della scheda ufficiale.
 */
function RatingNumberInput({
  id,
  label,
  registerProps,
}: {
  id: string;
  label: string;
  registerProps: ReturnType<
    ReturnType<typeof useForm<PlayerFormValues>>["register"]
  >;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] text-foreground/80">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={1}
        max={10}
        step={1}
        placeholder="—"
        className="h-9"
        {...registerProps}
      />
    </div>
  );
}

/**
 * Form di inserimento giocatore.
 * NOTE — Transfermarkt:
 * Il campo `transfermarkt_url` è solo testuale per ora; un futuro bottone
 * "Importa da TM" chiamerà syncFromTransfermarkt in
 * app/(app)/scouting/actions.ts per popolare automaticamente squadra,
 * valore, scadenza e nazionalità.
 */
export function PlayerForm({
  existing,
}: {
  existing?: { id: string; values: PlayerFormValues };
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!existing;
  const cancelHref = existing ? `/scouting/${existing.id}` : "/scouting";

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: existing?.values ?? emptyPlayerForm(),
  });

  const ruoloPrimario = form.watch("ruolo_principale");

  // Rating raggruppati per macro → area
  const ratingsByMacroArea = useMemo(() => {
    const out = new Map<RatingMacroGroup, Map<RatingArea, RatingDef[]>>();
    for (const r of RATINGS) {
      const macro = RATING_AREA_MACRO[r.area];
      if (!out.has(macro)) out.set(macro, new Map());
      const m = out.get(macro)!;
      if (!m.has(r.area)) m.set(r.area, []);
      m.get(r.area)!.push(r);
    }
    return out;
  }, []);

  async function onSubmit(values: PlayerFormValues) {
    setSubmitting(true);
    try {
      if (existing) {
        const { id } = await updatePlayer(existing.id, values);
        toast.success("Modifiche salvate");
        router.push(`/scouting/${id}`);
      } else {
        const { id } = await createPlayer(values);
        toast.success("Giocatore aggiunto");
        router.push(`/scouting/${id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      toast.error("Salvataggio fallito", { description: message });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href={cancelHref}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isEdit ? "Torna al dettaglio" : "Torna allo Scouting DB"}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {isEdit ? "Modifica giocatore" : "Aggiungi giocatore"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={() => router.push(cancelHref)}
          >
            <X className="mr-2 h-4 w-4" />
            Annulla
          </Button>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEdit ? "Salva modifiche" : "Salva giocatore"}
              </>
            )}
          </Button>
        </div>
      </header>

      {/* §1 Anagrafica */}
      <FormSection title="Anagrafica" description="Identità del giocatore.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" autoComplete="off" {...form.register("nome")} />
            <FieldError message={form.formState.errors.nome?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cognome">Cognome *</Label>
            <Input id="cognome" autoComplete="off" {...form.register("cognome")} />
            <FieldError message={form.formState.errors.cognome?.message} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="foto_url">URL foto profilo</Label>
            <Input
              id="foto_url"
              type="url"
              placeholder="https://…"
              autoComplete="off"
              {...form.register("foto_url")}
            />
            <p className="text-[10px] text-muted-foreground">
              {/* TODO upload: in futuro caricamento diretto su bucket "scouting" */}
              Per ora incolla un URL pubblico. L&apos;upload diretto arriverà.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_nascita">Data di nascita</Label>
            <Input
              id="data_nascita"
              type="date"
              {...form.register("data_nascita")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nazionalita">Nazionalità</Label>
            <Input
              id="nazionalita"
              placeholder="Es. Italia"
              autoComplete="off"
              {...form.register("nazionalita")}
            />
          </div>
          <div className="space-y-2">
            <Label>Passaporto</Label>
            <Controller
              control={form.control}
              name="passaporto"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {PASSAPORTO_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {PASSAPORTO_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Piede preferito</Label>
            <Controller
              control={form.control}
              name="piede"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {PIEDE_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {PIEDE_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </FormSection>

      {/* §2 Posizionamento */}
      <FormSection
        title="Posizionamento tattico"
        description="Ruolo principale, ruoli secondari e stili di gioco caratteristici."
      >
        <div className="space-y-2">
          <Label>Ruolo principale</Label>
          <Controller
            control={form.control}
            name="ruolo_principale"
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {RUOLO_GRUPPI.map((gruppo) => (
                    <SelectGroup key={gruppo.label}>
                      <SelectLabel>{gruppo.label}</SelectLabel>
                      {gruppo.values.map((v) => (
                        <SelectItem key={v} value={v}>
                          <span className="font-mono text-xs font-semibold">
                            {v}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            {RUOLO_LABEL[v]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Ruoli secondari</Label>
          <p className="text-xs text-muted-foreground">
            Altre posizioni in cui può rendere bene.
          </p>
          <Controller
            control={form.control}
            name="ruoli_secondari"
            render={({ field }) => (
              <RuoliSecondariToggle
                value={field.value as RuoloEnum[]}
                onChange={(v) =>
                  field.onChange(
                    v.filter((x) => x !== ruoloPrimario) as RuoloEnum[],
                  )
                }
                primario={ruoloPrimario}
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Stili di gioco</Label>
          <p className="text-xs text-muted-foreground">
            Es. <em>Difensore d&apos;impostazione, Ala a piede invertito,
            Centravanti di manovra</em>. Premi Invio per aggiungere.
          </p>
          <Controller
            control={form.control}
            name="stili_gioco"
            render={({ field }) => (
              <FreeChipInput
                value={field.value}
                onChange={field.onChange}
                placeholder="Aggiungi uno stile…"
              />
            )}
          />
        </div>
      </FormSection>

      {/* §3 Contratto */}
      <FormSection
        title="Situazione contrattuale"
        description="Squadra, contratto, valore di mercato e Transfermarkt."
      >
        <div className="space-y-2">
          <Label htmlFor="transfermarkt_url">URL profilo Transfermarkt</Label>
          <Input
            id="transfermarkt_url"
            type="url"
            placeholder="https://www.transfermarkt.com/…"
            autoComplete="off"
            {...form.register("transfermarkt_url")}
          />
          <p className="text-[10px] text-muted-foreground">
            {/* TODO Transfermarkt auto-fetch */}
            In futuro un click qui aggiornerà automaticamente squadra, valore e
            scadenza partendo da Transfermarkt.
          </p>
          <FieldError message={form.formState.errors.transfermarkt_url?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="squadra_attuale">Squadra attuale</Label>
            <Input id="squadra_attuale" {...form.register("squadra_attuale")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campionato">Campionato / Lega</Label>
            <Input
              id="campionato"
              placeholder="Es. Serie B, Primeira Liga…"
              {...form.register("campionato")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scadenza_contratto">Scadenza contratto</Label>
            <Input
              id="scadenza_contratto"
              type="date"
              {...form.register("scadenza_contratto")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agenzia">Agenzia / Procuratore</Label>
            <Input id="agenzia" {...form.register("agenzia")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valore_mercato_eur">Valore di mercato (€)</Label>
            <Input
              id="valore_mercato_eur"
              type="number"
              min={0}
              step={50000}
              placeholder="0"
              {...form.register("valore_mercato_eur", {
                setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
              })}
            />
          </div>
          <div className="space-y-2">
            <Label>Fascia d&apos;ingaggio</Label>
            <Controller
              control={form.control}
              name="fascia_ingaggio"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {FASCIA_INGAGGIO_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {FASCIA_INGAGGIO_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </FormSection>

      {/* §4 Fisico */}
      <FormSection
        title="Profilo fisico"
        description="Misure e tre selettori a scelta singola dalla scheda ufficiale."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="altezza_cm">Altezza (cm)</Label>
            <Input
              id="altezza_cm"
              type="number"
              min={100}
              max={250}
              {...form.register("altezza_cm", {
                setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
              })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="peso_kg">Peso (kg)</Label>
            <Input
              id="peso_kg"
              type="number"
              min={30}
              max={200}
              {...form.register("peso_kg", {
                setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
              })}
            />
          </div>
          <div className="space-y-2">
            <Label>Struttura corporea</Label>
            <Controller
              control={form.control}
              name="struttura_corporea"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {STRUTTURA_CORPOREA_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {STRUTTURA_CORPOREA_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Gesti motori</Label>
            <Controller
              control={form.control}
              name="gesti_motori"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {GESTI_MOTORI_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {GESTI_MOTORI_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Muscolatura</Label>
            <Controller
              control={form.control}
              name="muscolatura"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCOLATURA_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {MUSCOLATURA_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacita_condizionali">Capacità condizionali</Label>
          <Textarea
            id="capacita_condizionali"
            rows={3}
            placeholder="Note libere su test fisici, recupero, infortuni…"
            {...form.register("capacita_condizionali")}
          />
        </div>
      </FormSection>

      {/* §A Comportamentali */}
      <FormSection
        title="Comportamentali"
        description="Voti 1-10 sulla scheda ufficiale, più domande binarie e indicatori di influenza negativa."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RATINGS.filter((r) => r.area === "COMPORTAMENTALI").map((r) => (
            <RatingNumberInput
              key={r.key}
              id={r.key}
              label={r.label}
              registerProps={form.register(r.key as RatingKey, {
                setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
              })}
            />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Delega gli altri?</Label>
            <Controller
              control={form.control}
              name="behav_delega_altri"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {SI_NO_AVOLTE_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {SI_NO_AVOLTE_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Si assume responsabilità?</Label>
            <Controller
              control={form.control}
              name="behav_assume_responsabilita"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {SI_NO_AVOLTE_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {SI_NO_AVOLTE_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">
            Si fa influenzare negativamente da:
          </Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {INFLUENZE_NEG.map((i) => (
              <Controller
                key={i.key}
                control={form.control}
                name={i.key}
                render={({ field }) => (
                  <label
                    htmlFor={i.key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-card/30 px-3 py-2 hover:bg-card/60"
                  >
                    <Checkbox
                      id={i.key}
                      checked={!!field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    <span className="text-xs text-foreground/80">{i.label}</span>
                  </label>
                )}
              />
            ))}
          </div>
        </div>
      </FormSection>

      {/* §C Atletiche */}
      <FormSection
        title="Caratteristiche atletiche"
        description="Voti 1-10 (lasciare vuoto = non valutato)."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RATINGS.filter((r) => r.area === "ATLETICHE").map((r) => (
            <RatingNumberInput
              key={r.key}
              id={r.key}
              label={r.label}
              registerProps={form.register(r.key as RatingKey, {
                setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
              })}
            />
          ))}
        </div>
      </FormSection>

      {/* §D Tecnica & Coordinative */}
      <FormSection
        title="Tecnica & Coordinative"
        description="Capacità tecniche di base e capacità coordinative motorie."
      >
        {(["TECNICA", "COORDINATIVE"] as RatingArea[]).map((area) => {
          const items = RATINGS.filter((r) => r.area === area);
          if (!items.length) return null;
          return (
            <div key={area} className="space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {RATING_AREA_LABEL[area]}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((r) => (
                  <RatingNumberInput
                    key={r.key}
                    id={r.key}
                    label={r.label}
                    registerProps={form.register(r.key as RatingKey, {
                      setValueAs: (v) =>
                        v === "" || v == null ? null : Number(v),
                    })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </FormSection>

      {/* §E Tattica individuale */}
      <FormSection
        title="Tattica individuale"
        description="Comportamento del giocatore in fase di possesso e non possesso."
      >
        {(
          ["TATT_IND_POSSESSO", "TATT_IND_NON_POSSESSO"] as RatingArea[]
        ).map((area) => {
          const items = RATINGS.filter((r) => r.area === area);
          if (!items.length) return null;
          return (
            <div key={area} className="space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {RATING_AREA_LABEL[area]}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((r) => (
                  <RatingNumberInput
                    key={r.key}
                    id={r.key}
                    label={r.label}
                    registerProps={form.register(r.key as RatingKey, {
                      setValueAs: (v) =>
                        v === "" || v == null ? null : Number(v),
                    })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </FormSection>

      {/* §F Tattica applicata */}
      <FormSection
        title="Tattica applicata"
        description="Lettura del gioco, contributo alla fase difensiva e comportamento nel ruolo."
      >
        {(
          [
            "TATT_APPL_POSSESSO",
            "TATT_APPL_NON_POSSESSO",
            "TATT_APPL_RUOLO",
          ] as RatingArea[]
        ).map((area) => {
          const items = RATINGS.filter((r) => r.area === area);
          if (!items.length) return null;
          return (
            <div key={area} className="space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {RATING_AREA_LABEL[area]}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((r) => (
                  <RatingNumberInput
                    key={r.key}
                    id={r.key}
                    label={r.label}
                    registerProps={form.register(r.key as RatingKey, {
                      setValueAs: (v) =>
                        v === "" || v == null ? null : Number(v),
                    })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </FormSection>

      {/* Workflow + Media */}
      <FormSection
        title="Workflow & Media"
        description="Stato dell'osservazione, voto potenziale, report e clip."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Status osservazione *</Label>
            <Controller
              control={form.control}
              name="status_osservazione"
              render={({ field, fieldState }) => (
                <>
                  <Select
                    value={field.value}
                    onValueChange={(v) => v && field.onChange(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OSSERVAZIONE_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {STATUS_OSSERVAZIONE_LABEL[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldState.error?.message} />
                </>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Voto potenziale</Label>
            <Controller
              control={form.control}
              name="voto_potenziale"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOTO_POTENZIALE_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {VOTO_POTENZIALE_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_ultimo_aggiornamento">
              Data ultimo aggiornamento *
            </Label>
            <Input
              id="data_ultimo_aggiornamento"
              type="date"
              {...form.register("data_ultimo_aggiornamento")}
            />
            <FieldError
              message={form.formState.errors.data_ultimo_aggiornamento?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scout_assegnato">Scout assegnato</Label>
            <Input
              id="scout_assegnato"
              placeholder="Es. Maria B."
              {...form.register("scout_assegnato")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scouting_report_url">URL scouting report (PDF)</Label>
          <Input
            id="scouting_report_url"
            type="url"
            placeholder="https://… link al PDF del report"
            {...form.register("scouting_report_url")}
          />
          <p className="text-[10px] text-muted-foreground">
            {/* TODO upload: futuro caricamento diretto del PDF su bucket scouting */}
            Per ora incolla l&apos;URL del PDF.
          </p>
          <FieldError
            message={form.formState.errors.scouting_report_url?.message}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note_rapide">Note rapide / Diario live</Label>
          <Textarea
            id="note_rapide"
            rows={5}
            placeholder="Appunti dal vivo o post-visione…"
            {...form.register("note_rapide")}
          />
        </div>

        <div className="space-y-2">
          <Label>Clip video</Label>
          <p className="text-xs text-muted-foreground">
            URL di clip (Wyscout, YouTube, MP4).
          </p>
          <Controller
            control={form.control}
            name="clip_video_urls"
            render={({ field, fieldState }) => (
              <>
                <VideoUrlList value={field.value} onChange={field.onChange} />
                <FieldError message={fieldState.error?.message} />
              </>
            )}
          />
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-2 pb-8">
        <Button
          type="button"
          variant="ghost"
          disabled={submitting}
          onClick={() => router.push(cancelHref)}
        >
          Annulla
        </Button>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvataggio…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isEdit ? "Salva modifiche" : "Salva giocatore"}
            </>
          )}
        </Button>
      </div>

      {/* Esposizione macro-group per debug futuro (no-op, evita import unused) */}
      <span className="hidden">
        {Object.keys(RATING_MACRO_LABEL).length} macro groups; ratings:{" "}
        {ratingsByMacroArea.size}
      </span>
    </form>
  );
}
