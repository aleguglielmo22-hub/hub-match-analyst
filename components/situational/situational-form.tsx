"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, X } from "lucide-react";
import {
  emptySituationalForm,
  situationalFormSchema,
  type SituationalFormValues,
} from "@/lib/schemas/situational";
import {
  FOCUS_TAGS_PRESET,
  MACRO_FASE_BADGE,
  MACRO_FASE_DESC,
  MACRO_FASE_LABEL,
  MACRO_FASE_VALUES,
  SOTTO_FASE_DESC,
  SOTTO_FASE_LABEL,
  SOTTO_FASI_BY_MACRO,
  type MacroFaseEnum,
  type SottoFaseEnum,
} from "@/lib/types/situational";
import { createSituational } from "@/app/(app)/situational/actions";
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

/** Input a chip libero (autori, numero_giocatori). */
function FreeChipInput({
  value,
  onChange,
  placeholder,
  suggestions,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: readonly string[];
}) {
  const [draft, setDraft] = useState("");
  function commit(s: string) {
    const t = s.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setDraft("");
  }
  return (
    <div className="space-y-2">
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
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => commit(draft)}
          className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {suggestions && (
        <div className="flex flex-wrap gap-1">
          {suggestions
            .filter((s) => !value.includes(s))
            .slice(0, 12)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => commit(s)}
                className="rounded-md border border-dashed border-border/50 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Form di creazione Situazionale (catalogo tattico / esercitazione).
 *
 * 🌶️  CASCATA DINAMICA Livello 1 → Livello 2
 *
 * La sotto-fase dipende dalla macro-fase. Implementazione:
 *
 *  1) `form.watch("macro_fase")` ci dice qual è la macro corrente.
 *  2) `availableSottoFasi` viene ricalcolato (useMemo) a ogni cambio macro:
 *     contiene SOLO le sotto-fasi compatibili da SOTTO_FASI_BY_MACRO.
 *  3) Un `useEffect` rileva quando la macro cambia in modo che la sotto-fase
 *     diventi incompatibile (es. utente passa da POSSESSO a NON_POSSESSO e
 *     la sotto era "COSTRUZIONE_BASSA"): in quel caso resettiamo automaticamente
 *     la sotto al primo valore valido della nuova macro.
 *  4) Il <Select> della sotto-fase renderizza solo le opzioni di
 *     `availableSottoFasi`, quindi anche se reset non scattasse, l'utente
 *     non potrebbe selezionare un'opzione invalida.
 *  5) Il `.superRefine()` dello schema Zod + il CHECK del DB sono la rete
 *     di sicurezza finale: se in qualunque modo passasse una coppia
 *     incompatibile, il submit fallisce con messaggio chiaro.
 */
export function SituationalForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SituationalFormValues>({
    resolver: zodResolver(situationalFormSchema),
    defaultValues: emptySituationalForm(),
  });

  // [1] osservo la macro-fase selezionata
  const macroFase = form.watch("macro_fase");
  const sottoFase = form.watch("sotto_fase");

  // [2] sotto-fasi compatibili — ricomposte a ogni cambio di macro
  const availableSottoFasi: SottoFaseEnum[] = useMemo(
    () => SOTTO_FASI_BY_MACRO[macroFase],
    [macroFase],
  );

  // [3] se la sotto attuale è incompatibile col nuovo macro, resetta
  useEffect(() => {
    if (!availableSottoFasi.includes(sottoFase)) {
      form.setValue("sotto_fase", availableSottoFasi[0], {
        shouldValidate: true,
      });
    }
  }, [availableSottoFasi, sottoFase, form]);

  async function onSubmit(values: SituationalFormValues) {
    setSubmitting(true);
    try {
      const { id } = await createSituational(values);
      toast.success("Situazione salvata");
      router.push(`/situational/${id}`);
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
            href="/situational"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna al catalogo
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Nuova situazione / esercizio
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={() => router.push("/situational")}
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
                Salva
              </>
            )}
          </Button>
        </div>
      </header>

      {/* § 1 Metadati */}
      <FormSection
        title="Metadati e info generali"
        description="Titolo della situazione/esercizio e informazioni di contesto."
      >
        <div className="space-y-2">
          <Label htmlFor="titolo">Titolo *</Label>
          <Input
            id="titolo"
            placeholder='Es. "Uscita a 3 contro pressione a 2"'
            {...form.register("titolo")}
          />
          <FieldError message={form.formState.errors.titolo?.message} />
        </div>
        <div className="space-y-2">
          <Label>Autori / Fonte</Label>
          <p className="text-xs text-muted-foreground">
            Es. Guardiola, De Zerbi, Gasperini, Real Madrid, &quot;Creatività
            personale&quot;.
          </p>
          <Controller
            control={form.control}
            name="autori"
            render={({ field }) => (
              <FreeChipInput
                value={field.value}
                onChange={field.onChange}
                placeholder="Aggiungi autore / fonte…"
              />
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Numero giocatori</Label>
            <p className="text-xs text-muted-foreground">
              Es. 11v11, 8v8+3 Jolly, 4v4+Portieri.
            </p>
            <Controller
              control={form.control}
              name="numero_giocatori"
              render={({ field }) => (
                <FreeChipInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Aggiungi configurazione…"
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spazio_dimensioni">Spazio / Dimensioni</Label>
            <Input
              id="spazio_dimensioni"
              placeholder="Es. 40x30m, doppia area di rigore, 3/4 di campo"
              {...form.register("spazio_dimensioni")}
            />
          </div>
        </div>
      </FormSection>

      {/* § 2 & § 3 Macro + Sotto fase (cascata dinamica) */}
      <FormSection
        title="Classificazione tattica"
        description="Macro-fase (Livello 1) e sotto-fase (Livello 2). La seconda dipende dalla prima."
      >
        {/* Livello 1: chips macro-fase */}
        <div className="space-y-2">
          <Label>Livello 1 · Macro-fase *</Label>
          <Controller
            control={form.control}
            name="macro_fase"
            render={({ field, fieldState }) => (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {MACRO_FASE_VALUES.map((m) => {
                    const c = MACRO_FASE_BADGE[m];
                    const active = field.value === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => field.onChange(m)}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? cn(c.bg, c.text, c.ring, "ring-1 border-transparent")
                            : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground",
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
                        <span>{MACRO_FASE_LABEL[m]}</span>
                        <span className="text-[9px] opacity-60">
                          {MACRO_FASE_DESC[m]}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <FieldError message={fieldState.error?.message} />
              </>
            )}
          />
        </div>

        {/*
         * Livello 2: select dinamico.
         * Opzioni filtrate dalla macro corrente (`availableSottoFasi`),
         * con reset automatico quando l'utente cambia macro (vedi useEffect).
         */}
        <div className="space-y-2">
          <Label>Livello 2 · Sotto-fase *</Label>
          <Controller
            control={form.control}
            name="sotto_fase"
            render={({ field, fieldState }) => (
              <>
                <Select
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v as SottoFaseEnum)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSottoFasi.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className="block">
                          <span>{SOTTO_FASE_LABEL[s]}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Descrizione contestuale della sotto-fase selezionata */}
                {field.value && (
                  <p className="text-[11px] text-muted-foreground">
                    {SOTTO_FASE_DESC[field.value]}
                  </p>
                )}
                <FieldError message={fieldState.error?.message} />
              </>
            )}
          />
        </div>
      </FormSection>

      {/* § 4 Focus tattico */}
      <FormSection
        title="Focus tattico"
        description="Tag rapidi (concetti / principi di gioco) per ritrovare l'esercizio."
      >
        <Controller
          control={form.control}
          name="focus_tags"
          render={({ field }) => (
            <FreeChipInput
              value={field.value}
              onChange={field.onChange}
              placeholder="Aggiungi un tag…"
              suggestions={FOCUS_TAGS_PRESET}
            />
          )}
        />
      </FormSection>

      {/* § 5 Struttura esercitazione */}
      <FormSection
        title="Struttura dell'esercitazione"
        description="Pensata per gli staff tecnici: come si svolge l'esercizio sul campo."
      >
        <div className="space-y-2">
          <Label htmlFor="descrizione_flusso">Descrizione del flusso</Label>
          <Textarea
            id="descrizione_flusso"
            rows={6}
            placeholder="Spiega lo svolgimento dell'esercizio: come parte la palla, ruoli, fluss…"
            {...form.register("descrizione_flusso")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="regole_provocazione">Regole di provocazione</Label>
          <Textarea
            id="regole_provocazione"
            rows={5}
            placeholder='Es. "Il gol vale doppio se nasce da dentro-fuori-dentro" oppure "Max 3 tocchi a centrocampo".'
            {...form.register("regole_provocazione")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="varianti">Varianti</Label>
          <Textarea
            id="varianti"
            rows={5}
            placeholder="Come rendere l'esercizio più facile o più difficile."
            {...form.register("varianti")}
          />
        </div>
      </FormSection>

      {/* § 6 Media */}
      <FormSection
        title="Materiale multimediale"
        description="Link al video, alla lavagna grafica e al PDF della scheda."
      >
        <div className="space-y-2">
          <Label htmlFor="video_url">Video clip reale (URL)</Label>
          <Input
            id="video_url"
            type="url"
            placeholder="https://… (MP4, YouTube, Wyscout)"
            {...form.register("video_url")}
          />
          <FieldError message={form.formState.errors.video_url?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lavagna_url">Lavagna grafica / animazione (URL)</Label>
          <Input
            id="lavagna_url"
            type="url"
            placeholder="https://… link a immagine o animazione"
            {...form.register("lavagna_url")}
          />
          <FieldError message={form.formState.errors.lavagna_url?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pdf_url">Scheda esercizio PDF (URL)</Label>
          <Input
            id="pdf_url"
            type="url"
            placeholder="https://… link al PDF da stampare"
            {...form.register("pdf_url")}
          />
          <FieldError message={form.formState.errors.pdf_url?.message} />
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-2 pb-8">
        <Button
          type="button"
          variant="ghost"
          disabled={submitting}
          onClick={() => router.push("/situational")}
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
              Salva
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
