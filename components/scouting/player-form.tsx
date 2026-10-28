"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
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
  RATINGS,
  RUOLO_GRUPPI,
  RUOLO_LABEL,
  SI_NO_AVOLTE_LABEL,
  SI_NO_AVOLTE_VALUES,
  STATUS_OSSERVAZIONE_LABEL,
  STATUS_OSSERVAZIONE_VALUES,
  STRUTTURA_CORPOREA_LABEL,
  STRUTTURA_CORPOREA_VALUES,
  VOTO_POTENZIALE_LABEL,
  VOTO_POTENZIALE_VALUES,
  type RatingArea,
  type RatingKey,
  type RuoloEnum,
} from "@/lib/types/scouting";
import {
  PLAYER_SECTIONS,
  RATING_TABS,
  ageOn,
  firstSectionWithError,
  isFutureDate,
  isPastDate,
  ratingAreaCompletion,
  sectionCompletion,
  showGoalkeeperTab,
  todayIso,
  visibleRatingTabs,
  type Completion,
  type PlayerSectionId,
} from "@/lib/scouting/player-form-sections";
import { suggestPassport } from "@/lib/geo/countries";
import {
  createPlayer,
  findPossibleDuplicates,
  updatePlayer,
  type PossibleDuplicate,
} from "@/app/(app)/scouting/actions";
import { createTeam, type LookupOption } from "@/app/(app)/archivio/actions";
import type { LinkTarget, PlayerSetPiece } from "@/app/(app)/collegamenti/actions";
import { Combobox } from "@/components/archivio/combobox";
import {
  AttachmentsField,
  type PendingAttachment,
} from "@/components/attachments/attachments-field";
import { uploadPendingAttachments } from "@/components/attachments/upload";
import { useFormDraft } from "@/components/forms/use-form-draft";
import { DraftBanner } from "@/components/forms/draft-banner";
import { ArchiveLinksSection } from "@/components/links/archive-links-section";
import { PlayerSetPiecesList } from "@/components/links/linked-lists";
import { NationalityPicker } from "@/components/scouting/nationality-picker";
import { RatingButtons } from "@/components/scouting/rating-buttons";
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
import { MobileSaveBar } from "@/components/app/mobile-save-bar";
import { focusNextFieldOnEnter } from "@/lib/forms/enter-key";

/**
 * Sezione del form. Desktop: tutte una sotto l'altra. Mobile: solo quella
 * attiva (le altre restano montate, nascoste, per non perdere i valori).
 */
function FormSection({
  id,
  title,
  description,
  completion,
  hiddenOnMobile,
  children,
}: {
  id: PlayerSectionId;
  title: string;
  description?: string;
  completion: Completion;
  hiddenOnMobile: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`sezione-${id}`}
      data-section={id}
      aria-labelledby={`sezione-${id}-titolo`}
      className={cn(
        "scroll-mt-6 rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6",
        hiddenOnMobile && "max-md:hidden",
      )}
    >
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 id={`sezione-${id}-titolo`} className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <CompletionBadge completion={completion} />
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function CompletionBadge({ completion, className }: { completion: Completion; className?: string }) {
  const done = completion.total > 0 && completion.filled === completion.total;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ring-1",
        done
          ? "bg-primary/10 text-primary ring-primary/30"
          : completion.filled > 0
            ? "bg-muted text-foreground/80 ring-border/60"
            : "bg-transparent text-muted-foreground ring-border/40",
        className,
      )}
      aria-label={`${completion.filled} campi compilati su ${completion.total}`}
    >
      {completion.filled}/{completion.total}
    </span>
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
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            aria-label={`Rimuovi ${t}`}
            className="relative rounded-sm hover:bg-primary/20 max-md:after:absolute max-md:after:-inset-4"
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
        enterKeyHint="done"
        className="flex-1 min-w-[8rem] bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm max-md:min-h-9"
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
                    "rounded-md border px-2 py-1 text-[11px] font-mono font-semibold transition-colors max-md:min-h-11 max-md:min-w-11 max-md:text-xs",
                    disabled
                      ? "border-border/40 bg-muted/30 text-muted-foreground/40 line-through"
                      : active
                        ? "border-primary/60 bg-primary/10 text-primary"
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
          inputMode="url"
          enterKeyHint="done"
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
                className="relative rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive max-md:after:absolute max-md:after:-inset-3"
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

/** Select a scelta singola con "—" = nessun valore. */
function EnumSelect({
  value,
  onChange,
  values,
  labels,
  id,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  values: readonly string[];
  labels: Record<string, string>;
  id?: string;
}) {
  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange(v || null)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        {values.map((v) => (
          <SelectItem key={v} value={v}>
            {labels[v]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Punto del form aperto, salvato con la bozza. */
type FormView = { section: PlayerSectionId; area: RatingArea };

function isFormView(v: unknown): v is FormView {
  const x = v as FormView | null;
  return (
    !!x &&
    PLAYER_SECTIONS.some((s) => s.id === x.section) &&
    (RATING_TABS as string[]).includes(x.area)
  );
}

/**
 * Form giocatore a sezioni: indice laterale su desktop, una sezione alla volta
 * su mobile (Indietro / Avanti, "3 di 7"), "Salva" sempre disponibile.
 * Obbligatori solo nome e cognome.
 */
export function PlayerForm({
  existing,
  teams: initialTeams,
  defaultScout,
  links,
}: {
  existing?: { id: string; values: PlayerFormValues; updatedAt: string };
  /** Squadre condivise (recenti in cima). */
  teams: LookupOption[];
  /** Nuovo giocatore: "Scout assegnato" precompilato con l'utente corrente. */
  defaultScout?: string | null;
  /** Modifica: collegamenti del giocatore (null = errore di caricamento). */
  links?: { setPieces: PlayerSetPiece[]; archive: LinkTarget[] } | null;
}) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const isEdit = !!existing;
  const cancelHref = existing ? `/scouting/${existing.id}` : "/scouting";
  const saveLabel = isEdit ? "Salva modifiche" : "Salva giocatore";

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues:
      existing?.values ?? { ...emptyPlayerForm(), scout_assegnato: defaultScout?.trim() || null },
  });

  const [view, setView] = useState<FormView>({ section: "anagrafica", area: "TECNICA" });
  const topRef = useRef<HTMLDivElement>(null);

  // Id del nuovo elemento, generato all'apertura: un secondo invio non crea doppioni.
  const [newId, setNewId] = useState(() => crypto.randomUUID());
  const submittingRef = useRef(false);
  const draft = useFormDraft({
    section: "scouting",
    itemId: existing?.id ?? null,
    form,
    itemUpdatedAt: existing?.updatedAt,
    newItemId: existing ? undefined : newId,
    onRestoreNewItemId: setNewId,
    // La bozza ricorda sezione e scheda dei voti aperte.
    view,
    onRestoreView: (v) => {
      if (isFormView(v)) goTo(v.section, v.area);
    },
  });
  const leave = () => {
    if (draft.confirmLeave()) router.push(cancelHref);
  };

  const ruoloPrimario = form.watch("ruolo_principale");
  // Valori correnti, solo per conteggi, età e avvisi (non guidano i campi).
  const values = useWatch({ control: form.control }) as Record<string, unknown>;
  const showGoalkeeper = showGoalkeeperTab(
    values.ruolo_principale as RuoloEnum | null,
    values.ruoli_secondari as RuoloEnum[] | undefined,
  );
  const ratingTabs = visibleRatingTabs(showGoalkeeper);
  // Ruolo cambiato: la scheda Portiere sparisce ma i voti restano nel form.
  const area: RatingArea = ratingTabs.includes(view.area) ? view.area : "TECNICA";
  const completion = (id: PlayerSectionId) => sectionCompletion(values, id, showGoalkeeper);
  const sectionIndex = PLAYER_SECTIONS.findIndex((s) => s.id === view.section);
  const [sectionsOpen, setSectionsOpen] = useState(false);

  /** Apre una sezione: su mobile la mostra da sola, su desktop ci scorre. */
  function goTo(section: PlayerSectionId, nextArea?: RatingArea) {
    setView((v) => ({ section, area: nextArea ?? v.area }));
    setSectionsOpen(false);
    requestAnimationFrame(() => {
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      const target = desktop
        ? document.getElementById(`sezione-${section}`)
        : topRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Desktop: l'indice segue la sezione visibile mentre si scorre.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const sections = document.querySelectorAll<HTMLElement>("[data-section]");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!desktop.matches) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = visible?.target.getAttribute("data-section") as PlayerSectionId | null;
        if (id) setView((v) => (v.section === id ? v : { ...v, section: id }));
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Età e controlli sulle date.
  const today = todayIso();
  const birth = values.data_nascita as string | null;
  const age = ageOn(birth, today);
  const birthInFuture = isFutureDate(birth, today);
  const contractExpired = isPastDate(values.scadenza_contratto as string | null, today);

  // Possibili doppioni: stessi nome, cognome e data di nascita (anche nel cestino).
  const dupNome = String(values.nome ?? "").trim();
  const dupCognome = String(values.cognome ?? "").trim();
  const dupKey = dupNome && dupCognome && birth && !birthInFuture ? `${dupNome}|${dupCognome}|${birth}` : null;
  const [duplicates, setDuplicates] = useState<{ key: string; items: PossibleDuplicate[] } | null>(null);
  useEffect(() => {
    if (!dupKey) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const [nome, cognome, data_nascita] = dupKey.split("|");
      const items = await findPossibleDuplicates({
        nome,
        cognome,
        data_nascita,
        excludeId: existing?.id ?? null,
      });
      if (!cancelled) setDuplicates({ key: dupKey, items });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dupKey, existing?.id]);
  const shownDuplicates = duplicates && duplicates.key === dupKey ? duplicates.items : [];

  async function onSubmit(values: PlayerFormValues) {
    // Blocca un secondo invio (doppio clic, Invio) mentre il primo è in corso.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    let id: string;
    try {
      id = existing
        ? (await updatePlayer(existing.id, values)).id
        : (await createPlayer(newId, values)).id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      toast.error("Salvataggio fallito", { description: message });
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }
    draft.markSaved();

    const { failed } = await uploadPendingAttachments(
      "player",
      id,
      pendingAttachments.map((p) => p.file),
    );
    if (failed.length > 0) {
      toast.warning("Elemento salvato, ma alcuni allegati non sono stati caricati", {
        description: `${failed.join(", ")}. Riprova dalla pagina di modifica.`,
        duration: 10000,
      });
      // Pagina di modifica ricaricata da capo, con gli allegati aggiornati.
      window.location.assign(`/scouting/${id}/modifica`);
      return;
    }
    toast.success(existing ? "Modifiche salvate" : "Giocatore aggiunto");
    router.push(`/scouting/${id}`);
  }

  // Errori: si apre la sezione (e la scheda dei voti) con il primo errore.
  function onInvalid(errors: FieldErrors<PlayerFormValues>) {
    const fields = Object.keys(errors);
    const section = firstSectionWithError(fields);
    if (!section) return;
    const ratingError = RATINGS.find((r) => fields.includes(r.key));
    goTo(section, section === "valutazioni" && ratingError ? ratingError.area : undefined);
    toast.error("Controlla i campi segnalati", {
      description: PLAYER_SECTIONS.find((s) => s.id === section)?.label,
    });
  }

  const errors = form.formState.errors;
  const clipError = Array.isArray(errors.clip_video_urls)
    ? errors.clip_video_urls.some(Boolean) && "Uno dei link delle clip non è valido"
    : errors.clip_video_urls?.message;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      onKeyDown={focusNextFieldOnEnter}
      className="space-y-5 max-md:pb-24"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href={cancelHref}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground max-md:-ml-2 max-md:min-h-11 max-md:px-2 max-md:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isEdit ? "Torna al dettaglio" : "Torna allo Scouting DB"}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {isEdit ? "Modifica giocatore" : "Aggiungi giocatore"}
          </h1>
        </div>
        <div className="flex items-center gap-2 max-md:hidden">
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={leave}
          >
            <X className="mr-2 h-4 w-4" />
            Annulla
          </Button>
          <SaveButton submitting={submitting} label={saveLabel} />
        </div>
      </header>

      <DraftBanner
        draft={draft.pending}
        onRestore={draft.restore}
        onDiscard={draft.discard}
      />

      <div ref={topRef} className="scroll-mt-4 md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:items-start md:gap-6">
        {/* Desktop: indice delle sezioni, sempre visibile */}
        <nav aria-label="Sezioni del form" className="sticky top-6 max-md:hidden">
          <ol className="space-y-1">
            {PLAYER_SECTIONS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => goTo(s.id)}
                  aria-current={view.section === s.id ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    view.section === s.id
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="truncate">
                    <span className="mr-1.5 tabular-nums opacity-60">{i + 1}.</span>
                    {s.label}
                  </span>
                  <CompletionBadge completion={completion(s.id)} />
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-5">
          {/* Mobile: dove sono e salto rapido tra le sezioni */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setSectionsOpen((o) => !o)}
              aria-expanded={sectionsOpen}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 px-4 text-left"
            >
              <span className="text-sm">
                <span className="font-semibold tabular-nums">
                  {sectionIndex + 1} di {PLAYER_SECTIONS.length}
                </span>
                <span className="text-muted-foreground"> · {PLAYER_SECTIONS[sectionIndex].label}</span>
              </span>
              <span className="text-xs text-primary">{sectionsOpen ? "Chiudi" : "Sezioni"}</span>
            </button>
            {sectionsOpen && (
              <ol className="mt-2 divide-y divide-border/50 rounded-xl border border-border/60 bg-card/60">
                {PLAYER_SECTIONS.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => goTo(s.id)}
                      aria-current={view.section === s.id ? "step" : undefined}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between gap-2 px-4 text-left text-sm",
                        view.section === s.id && "font-medium text-primary",
                      )}
                    >
                      <span>
                        <span className="mr-1.5 tabular-nums opacity-60">{i + 1}.</span>
                        {s.label}
                      </span>
                      <CompletionBadge completion={completion(s.id)} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* 1. Anagrafica */}
          <FormSection
            id="anagrafica"
            title="Anagrafica"
            description="Identità del giocatore. Obbligatori solo nome e cognome."
            completion={completion("anagrafica")}
            hiddenOnMobile={view.section !== "anagrafica"}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" autoComplete="off" {...form.register("nome")} />
                <FieldError message={errors.nome?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cognome">Cognome *</Label>
                <Input id="cognome" autoComplete="off" {...form.register("cognome")} />
                <FieldError message={errors.cognome?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_nascita">Data di nascita</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="data_nascita"
                    type="date"
                    max={today}
                    className="flex-1"
                    {...form.register("data_nascita")}
                  />
                  {age !== null && (
                    <span className="shrink-0 text-sm font-medium tabular-nums text-foreground/80">
                      {age} anni
                    </span>
                  )}
                </div>
                <FieldError
                  message={
                    birthInFuture
                      ? "La data di nascita non può essere nel futuro"
                      : errors.data_nascita?.message
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Piede preferito</Label>
                <Controller
                  control={form.control}
                  name="piede"
                  render={({ field }) => (
                    <EnumSelect value={field.value} onChange={field.onChange} values={PIEDE_VALUES} labels={PIEDE_LABEL} />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nazionalita">Nazionalità</Label>
                <Controller
                  control={form.control}
                  name="nazionalita"
                  render={({ field }) => (
                    <NationalityPicker
                      id="nazionalita"
                      value={field.value}
                      onChange={(next, list) => {
                        field.onChange(next);
                        // Proposta solo se il passaporto è vuoto: mai sovrascritto.
                        const suggested = suggestPassport(list);
                        if (suggested && form.getValues("passaporto") == null) {
                          form.setValue("passaporto", suggested, { shouldDirty: true });
                        }
                      }}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Passaporto</Label>
                <Controller
                  control={form.control}
                  name="passaporto"
                  render={({ field }) => (
                    <EnumSelect value={field.value} onChange={field.onChange} values={PASSAPORTO_VALUES} labels={PASSAPORTO_LABEL} />
                  )}
                />
                <p className="text-[10px] text-muted-foreground">
                  Proposto «Comunitario» se una nazionalità è un paese dell&apos;Unione Europea.
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="foto_url">Link foto profilo</Label>
                <Input
                  id="foto_url"
                  inputMode="url"
                  placeholder="es. www.sito.it/foto.jpg"
                  autoComplete="off"
                  {...form.register("foto_url")}
                />
                <p className="text-[10px] text-muted-foreground">
                  Incolla il link pubblico di un&apos;immagine (anche senza https://).
                </p>
                <FieldError message={errors.foto_url?.message} />
              </div>
            </div>

            {shownDuplicates.length > 0 && (
              <div
                role="status"
                className="flex gap-3 rounded-lg border border-tone-warning/40 bg-tone-warning-soft px-3 py-2.5 text-xs text-tone-warning-fg"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">
                    Possibile doppione: esiste già un giocatore con stesso nome, cognome e data di nascita.
                  </p>
                  <ul className="space-y-0.5">
                    {shownDuplicates.map((d) => (
                      <li key={d.id}>
                        <a
                          href={d.inTrash ? "/cestino?sezione=scouting" : `/scouting/${d.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
                        >
                          {d.inTrash ? `Apri nel cestino (${d.nome} ${d.cognome})` : `Apri la scheda esistente (${d.nome} ${d.cognome})`}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="text-tone-warning-fg/80">Puoi comunque salvare.</p>
                </div>
              </div>
            )}
          </FormSection>

          {/* 2. Posizione e stile */}
          <FormSection
            id="posizione"
            title="Posizione e stile"
            description="Ruolo principale, ruoli secondari e stili di gioco caratteristici."
            completion={completion("posizione")}
            hiddenOnMobile={view.section !== "posizione"}
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

          {/* 3. Contratto */}
          <FormSection
            id="contratto"
            title="Contratto"
            description="Squadra, contratto e valore di mercato."
            completion={completion("contratto")}
            hiddenOnMobile={view.section !== "contratto"}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Squadra attuale</Label>
                <Controller
                  control={form.control}
                  name="team_attuale_id"
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? null}
                      onChange={field.onChange}
                      options={teams}
                      placeholder="Cerca o crea…"
                      onCreate={createTeam}
                      onCreated={(opt) => setTeams((t) => [opt, ...t])}
                    />
                  )}
                />
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
                {contractExpired && (
                  <p className="flex items-center gap-1.5 text-xs text-tone-warning-fg" role="status">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Data già passata: il contratto risulta scaduto.
                  </p>
                )}
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
                  inputMode="numeric"
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
                    <EnumSelect value={field.value} onChange={field.onChange} values={FASCIA_INGAGGIO_VALUES} labels={FASCIA_INGAGGIO_LABEL} />
                  )}
                />
              </div>
            </div>
          </FormSection>

          {/* 4. Fisico */}
          <FormSection
            id="fisico"
            title="Fisico"
            description="Misure e tre selettori a scelta singola dalla scheda ufficiale."
            completion={completion("fisico")}
            hiddenOnMobile={view.section !== "fisico"}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="altezza_cm">Altezza (cm)</Label>
                <Input
                  id="altezza_cm"
                  type="number"
                  inputMode="numeric"
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
                  inputMode="numeric"
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
                    <EnumSelect value={field.value} onChange={field.onChange} values={STRUTTURA_CORPOREA_VALUES} labels={STRUTTURA_CORPOREA_LABEL} />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Gesti motori</Label>
                <Controller
                  control={form.control}
                  name="gesti_motori"
                  render={({ field }) => (
                    <EnumSelect value={field.value} onChange={field.onChange} values={GESTI_MOTORI_VALUES} labels={GESTI_MOTORI_LABEL} />
                  )}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Muscolatura</Label>
                <Controller
                  control={form.control}
                  name="muscolatura"
                  render={({ field }) => (
                    <EnumSelect value={field.value} onChange={field.onChange} values={MUSCOLATURA_VALUES} labels={MUSCOLATURA_LABEL} />
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

          {/* 5. Comportamento */}
          <FormSection
            id="comportamento"
            title="Comportamento"
            description="Domande comportamentali e fattori di influenza negativa."
            completion={completion("comportamento")}
            hiddenOnMobile={view.section !== "comportamento"}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Delega gli altri?</Label>
                <Controller
                  control={form.control}
                  name="behav_delega_altri"
                  render={({ field }) => (
                    <EnumSelect value={field.value} onChange={field.onChange} values={SI_NO_AVOLTE_VALUES} labels={SI_NO_AVOLTE_LABEL} />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Si assume responsabilità?</Label>
                <Controller
                  control={form.control}
                  name="behav_assume_responsabilita"
                  render={({ field }) => (
                    <EnumSelect value={field.value} onChange={field.onChange} values={SI_NO_AVOLTE_VALUES} labels={SI_NO_AVOLTE_LABEL} />
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
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-card/30 px-3 py-2 hover:bg-card/60 max-md:min-h-11"
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

          {/* 6. Valutazioni: sotto-schede Tecnica · Psicologia · Fisico · Portiere */}
          <FormSection
            id="valutazioni"
            title="Valutazioni"
            description="Voti 1-10: tocca un numero per sceglierlo, toccalo di nuovo per cancellarlo."
            completion={completion("valutazioni")}
            hiddenOnMobile={view.section !== "valutazioni"}
          >
            <div role="tablist" aria-label="Aree di valutazione" className="flex flex-wrap gap-1.5">
              {ratingTabs.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="tab"
                  id={`tab-${a}`}
                  aria-selected={area === a}
                  aria-controls={`pannello-${a}`}
                  onClick={() => setView((v) => ({ ...v, area: a }))}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors max-md:min-h-11",
                    area === a
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {RATING_AREA_LABEL[a]}
                  <span className="tabular-nums opacity-70">
                    {ratingAreaCompletion(values, a).filled}/{ratingAreaCompletion(values, a).total}
                  </span>
                </button>
              ))}
            </div>
            {!showGoalkeeper && RATINGS.some((r) => r.area === "PORTIERE" && values[r.key] != null) && (
              <p className="text-[11px] text-muted-foreground">
                I voti da portiere già inseriti restano salvati: la scheda torna visibile con il ruolo POR.
              </p>
            )}
            {ratingTabs.map((a) => (
              <div
                key={a}
                role="tabpanel"
                id={`pannello-${a}`}
                aria-labelledby={`tab-${a}`}
                hidden={area !== a}
                className="grid gap-x-6 gap-y-4 lg:grid-cols-2"
              >
                {RATINGS.filter((r) => r.area === a).map((r) => (
                  <Controller
                    key={r.key}
                    control={form.control}
                    name={r.key as RatingKey}
                    render={({ field }) => (
                      <RatingButtons
                        id={r.key}
                        label={r.label}
                        value={(field.value as number | null) ?? null}
                        onChange={field.onChange}
                      />
                    )}
                  />
                ))}
              </div>
            ))}
          </FormSection>

          {/* 7. Stato e media */}
          <FormSection
            id="stato"
            title="Stato e media"
            description="Stato dell'osservazione, potenziale, scout, report, clip, allegati e collegamenti."
            completion={completion("stato")}
            hiddenOnMobile={view.section !== "stato"}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status osservazione</Label>
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
                    <EnumSelect value={field.value} onChange={field.onChange} values={VOTO_POTENZIALE_VALUES} labels={VOTO_POTENZIALE_LABEL} />
                  )}
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
              <Label htmlFor="scouting_report_url">Link scouting report (PDF)</Label>
              <Input
                id="scouting_report_url"
                inputMode="url"
                placeholder="es. drive.google.com/…"
                {...form.register("scouting_report_url")}
              />
              <p className="text-[10px] text-muted-foreground">
                Link al PDF del report (anche senza https://).
              </p>
              <FieldError message={errors.scouting_report_url?.message} />
            </div>

            <div className="space-y-2">
              <Label>Clip video</Label>
              <p className="text-xs text-muted-foreground">
                Link di clip (Wyscout, YouTube, MP4), anche senza https://.
              </p>
              <Controller
                control={form.control}
                name="clip_video_urls"
                render={({ field }) => (
                  <VideoUrlList value={field.value} onChange={field.onChange} />
                )}
              />
              <FieldError message={clipError || undefined} />
            </div>

            <div className="space-y-2">
              <Label>Allegati</Label>
              <p className="text-xs text-muted-foreground">
                File leggeri (PDF, immagini, documenti Office) oltre ai link qui sopra. Per i video usa un link.
              </p>
              <AttachmentsField
                entityType="player"
                entityId={existing?.id ?? null}
                pending={pendingAttachments}
                onPendingChange={setPendingAttachments}
              />
            </div>

            <div className="space-y-3">
              <Label>Collegamenti</Label>
              {existing ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <PlayerSetPiecesList setPieces={links?.setPieces ?? null} />
                  <ArchiveLinksSection
                    title="Clip e documenti"
                    emptyText="Nessuna voce del Cloud collegata."
                    canEdit
                    initial={links?.archive ?? null}
                    other={{ kind: "player", id: existing.id }}
                  />
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-xs text-muted-foreground">
                  Dopo il salvataggio potrai collegare il giocatore a piazzati e voci del Cloud.
                </p>
              )}
            </div>
          </FormSection>

          {/* Mobile: Indietro / Avanti */}
          <div className="flex items-center justify-between gap-3 md:hidden">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              disabled={sectionIndex === 0}
              onClick={() => goTo(PLAYER_SECTIONS[sectionIndex - 1].id)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Indietro
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {sectionIndex + 1} di {PLAYER_SECTIONS.length}
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              disabled={sectionIndex === PLAYER_SECTIONS.length - 1}
              onClick={() => goTo(PLAYER_SECTIONS[sectionIndex + 1].id)}
            >
              Avanti
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2 pb-8 max-md:hidden">
            <Button
              type="button"
              variant="ghost"
              disabled={submitting}
              onClick={leave}
            >
              Annulla
            </Button>
            <SaveButton submitting={submitting} label={saveLabel} />
          </div>
        </div>
      </div>

      <MobileSaveBar label={saveLabel} submitting={submitting} onCancel={leave} />
    </form>
  );
}

function SaveButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <Button type="submit" size="lg" disabled={submitting}>
      {submitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Salvataggio…
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}
