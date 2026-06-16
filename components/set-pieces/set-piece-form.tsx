"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Goal,
  Loader2,
  Save,
  Shield,
  X,
} from "lucide-react";
import {
  ALTEZZA_LINEA_LABEL,
  ALTEZZA_LINEA_VALUES,
  BEHAVIOR_TAGS_PRESET,
  ESITO_FINALE_LABEL,
  ESITO_FINALE_VALUES,
  FASE_LABEL,
  FASE_VALUES,
  LANDING_ZONES_PRESET,
  LATO_BATTUTA_LABEL,
  LATO_BATTUTA_VALUES,
  PIEDE_BATTITORE_LABEL,
  PIEDE_BATTITORE_VALUES,
  SISTEMA_MARCATURA_LABEL,
  SISTEMA_MARCATURA_VALUES,
  SPECIFICAZIONE_PUNIZIONE_LABEL,
  SPECIFICAZIONE_PUNIZIONE_VALUES,
  SVILUPPO_SCHEMA_LABEL,
  SVILUPPO_SCHEMA_VALUES,
  TIPO_PIAZZATO_LABEL,
  TIPO_PIAZZATO_VALUES,
  TRAIETTORIA_LABEL,
  TRAIETTORIA_VALUES,
  UOMINI_SUI_PALI_LABEL,
  UOMINI_SUI_PALI_VALUES,
  type FaseEnum,
  type TipoPiazzatoEnum,
} from "@/lib/types/set-pieces";
import {
  emptySetPieceForm,
  setPieceFormSchema,
  type SetPieceFormValues,
} from "@/lib/schemas/set-pieces";
import { createSetPiece } from "@/app/(app)/set-pieces/actions";
import {
  AttachmentsField,
  type PendingAttachment,
} from "@/components/attachments/attachments-field";
import { uploadPendingAttachments } from "@/components/attachments/upload";
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
  highlight,
  children,
}: {
  title: string;
  description?: string;
  /** Se true, evidenzia la sezione con bordo emerald (es. sezione attiva per fase). */
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card/40 p-5 sm:p-6 transition-colors",
        highlight ? "border-primary/40 bg-card/60" : "border-border/60",
      )}
    >
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

/** Chip toggle a valori predefiniti (per landing_zones e behavior_tags). */
function PresetTagToggle({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: readonly string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(v: string) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-card/30 text-muted-foreground hover:border-border/80 hover:text-foreground",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Form di inserimento Set Piece.
 *
 * Reattività condizionale:
 *  1. `tipo_piazzato === "PUNIZIONE"` → mostra il campo "Specificazione Punizione".
 *     Quando l'utente cambia tipo lontano da Punizione, il valore di
 *     `specificazione_punizione` viene resettato a null (vedi useEffect sotto).
 *
 *  2. `fase === "OFFENSIVO"` → mostra la sezione §3 (Dettagli offensivi)
 *     e azzera/nasconde tutti i campi della §4 (Dettagli difensivi).
 *
 *  3. `fase === "DIFENSIVO"` → mostra la sezione §4 e azzera la §3.
 *
 * I reset sono fondamentali sia per la UX (niente valori "fantasma" salvati
 * accidentalmente) sia per i CHECK constraint a DB che enforce la mutua esclusione.
 */
export function SetPieceForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);

  const form = useForm<SetPieceFormValues>({
    resolver: zodResolver(setPieceFormSchema),
    defaultValues: emptySetPieceForm(),
  });

  // Osserviamo i due valori che pilotano la reattività condizionale.
  const fase = form.watch("fase");
  const tipoPiazzato = form.watch("tipo_piazzato");

  /* --------------------------------------------------------------
   * Reset: quando l'utente passa fuori da "Punizione", "Specificazione
   * Punizione" non ha più senso e dev'essere riportato a null.
   * -------------------------------------------------------------- */
  useEffect(() => {
    if (tipoPiazzato !== "PUNIZIONE") {
      form.setValue("specificazione_punizione", null, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [tipoPiazzato, form]);

  /* --------------------------------------------------------------
   * Reset: cambiando fase si svuotano i campi della fase opposta.
   * Evita di salvare residui invisibili e fa passare i CHECK constraint
   * lato DB (chk_fase_mutua_esclusione in 0007_set_pieces.sql).
   * -------------------------------------------------------------- */
  useEffect(() => {
    if (fase === "OFFENSIVO") {
      form.setValue("sistema_marcatura", null, { shouldDirty: false });
      form.setValue("uomini_in_barriera", null, { shouldDirty: false });
      form.setValue("uomini_sui_pali", null, { shouldDirty: false });
      form.setValue("altezza_linea_difensiva", null, { shouldDirty: false });
      form.setValue("giocatori_in_transizione", null, { shouldDirty: false });
    } else if (fase === "DIFENSIVO") {
      form.setValue("piede_battitore", null, { shouldDirty: false });
      form.setValue("traiettoria", null, { shouldDirty: false });
      form.setValue("sviluppo_schema", null, { shouldDirty: false });
      form.setValue("landing_zones", [], { shouldDirty: false });
      form.setValue("behavior_tags", [], { shouldDirty: false });
      form.setValue("giocatori_in_area", null, { shouldDirty: false });
    }
  }, [fase, form]);

  async function onSubmit(values: SetPieceFormValues) {
    setSubmitting(true);
    try {
      const { id } = await createSetPiece(values);
      if (pendingAttachments.length > 0) {
        await uploadPendingAttachments(
          "set_piece",
          id,
          pendingAttachments.map((p) => p.file),
        );
      }
      toast.success("Schema salvato");
      router.push(`/set-pieces/${id}`);
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
            href="/set-pieces"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna ai Set Pieces DB
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Aggiungi schema
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={() => router.push("/set-pieces")}
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
                Salva schema
              </>
            )}
          </Button>
        </div>
      </header>

      {/* § 1 Metadati */}
      <FormSection
        title="Metadati dell'evento"
        description='Es. "Angolo 2+3 Blocchi", "Punizione Centrale Due Battitori".'
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="titolo">Titolo dello schema *</Label>
            <Input id="titolo" autoComplete="off" {...form.register("titolo")} />
            <FieldError message={form.formState.errors.titolo?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="squadra_esecutrice">Squadra esecutrice</Label>
            <Input
              id="squadra_esecutrice"
              placeholder="Chi batte"
              {...form.register("squadra_esecutrice")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="squadra_avversaria">Squadra avversaria</Label>
            <Input
              id="squadra_avversaria"
              placeholder="Chi difende"
              {...form.register("squadra_avversaria")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="competizione">Competizione</Label>
            <Input
              id="competizione"
              placeholder="Es. Serie A"
              {...form.register("competizione")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stagione">Stagione</Label>
            <Input
              id="stagione"
              placeholder="Es. 2025/2026"
              {...form.register("stagione")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_evento">Data evento</Label>
            <Input
              id="data_evento"
              type="date"
              {...form.register("data_evento")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minuto">Minuto</Label>
            <Input
              id="minuto"
              type="number"
              min={0}
              max={130}
              placeholder="0–130"
              {...form.register("minuto", {
                setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
              })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="punteggio">Punteggio al momento</Label>
            <Input
              id="punteggio"
              placeholder="Es. 1-0"
              {...form.register("punteggio")}
            />
          </div>
        </div>
      </FormSection>

      {/* § 2 Macro + logica condizionale */}
      <FormSection
        title="Filtri macro"
        description="Fase e tipo determinano quali sezioni verranno mostrate sotto."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Fase *</Label>
            <Controller
              control={form.control}
              name="fase"
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
                      {FASE_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {FASE_LABEL[v]}
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
            <Label>Tipo di piazzato *</Label>
            <Controller
              control={form.control}
              name="tipo_piazzato"
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
                      {TIPO_PIAZZATO_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {TIPO_PIAZZATO_LABEL[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldState.error?.message} />
                </>
              )}
            />
          </div>

          {/*
           * CONDIZIONALE #1
           * "Specificazione Punizione" appare solo se tipo_piazzato === "PUNIZIONE".
           * Il valore viene azzerato dall'useEffect quando l'utente cambia tipo,
           * quindi il campo non rimane mai compilato di nascosto.
           */}
          {tipoPiazzato === "PUNIZIONE" && (
            <div className="space-y-2 sm:col-span-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <Label>Specificazione punizione</Label>
              <Controller
                control={form.control}
                name="specificazione_punizione"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIFICAZIONE_PUNIZIONE_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {SPECIFICAZIONE_PUNIZIONE_LABEL[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError
                message={form.formState.errors.specificazione_punizione?.message}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Lato di battuta</Label>
            <Controller
              control={form.control}
              name="lato_battuta"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {LATO_BATTUTA_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {LATO_BATTUTA_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </FormSection>

      {/*
       * CONDIZIONALE #2 — Sezione §3 visibile solo in fase OFFENSIVO.
       * Quando l'utente passa a DIFENSIVO l'useEffect azzera i campi
       * (piede_battitore, traiettoria, sviluppo_schema, landing_zones,
       *  behavior_tags, giocatori_in_area) prima del salvataggio.
       */}
      {fase === "OFFENSIVO" && (
        <FormSection
          title="Dettagli offensivi"
          description="Visibili solo in fase Offensiva."
          highlight
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="inline-flex items-center gap-1.5">
                <Goal className="h-3.5 w-3.5 text-primary" />
                Piede del battitore
              </Label>
              <Controller
                control={form.control}
                name="piede_battitore"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIEDE_BATTITORE_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {PIEDE_BATTITORE_LABEL[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Traiettoria</Label>
              <Controller
                control={form.control}
                name="traiettoria"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRAIETTORIA_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {TRAIETTORIA_LABEL[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Sviluppo dello schema</Label>
              <Controller
                control={form.control}
                name="sviluppo_schema"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {SVILUPPO_SCHEMA_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {SVILUPPO_SCHEMA_LABEL[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="giocatori_in_area">Giocatori in area</Label>
              <Input
                id="giocatori_in_area"
                type="number"
                min={0}
                max={11}
                placeholder="0–11"
                {...form.register("giocatori_in_area", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Zona di caduta palla</Label>
            <p className="text-xs text-muted-foreground">
              Tag multipli — più zone target di un solo schema.
            </p>
            <Controller
              control={form.control}
              name="landing_zones"
              render={({ field }) => (
                <PresetTagToggle
                  value={field.value}
                  onChange={field.onChange}
                  options={LANDING_ZONES_PRESET}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Comportamento chiave</Label>
            <p className="text-xs text-muted-foreground">
              Tag multipli — movimenti caratterizzanti dei giocatori in attacco.
            </p>
            <Controller
              control={form.control}
              name="behavior_tags"
              render={({ field }) => (
                <PresetTagToggle
                  value={field.value}
                  onChange={field.onChange}
                  options={BEHAVIOR_TAGS_PRESET}
                />
              )}
            />
          </div>
        </FormSection>
      )}

      {/*
       * CONDIZIONALE #3 — Sezione §4 visibile solo in fase DIFENSIVO.
       * I campi offensivi vengono azzerati dall'useEffect al cambio di fase.
       */}
      {fase === "DIFENSIVO" && (
        <FormSection
          title="Dettagli difensivi"
          description="Visibili solo in fase Difensiva."
          highlight
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                Sistema di marcatura
              </Label>
              <Controller
                control={form.control}
                name="sistema_marcatura"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {SISTEMA_MARCATURA_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {SISTEMA_MARCATURA_LABEL[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uomini_in_barriera">Uomini in barriera</Label>
              <Input
                id="uomini_in_barriera"
                type="number"
                min={0}
                max={9}
                placeholder="0–9"
                {...form.register("uomini_in_barriera", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
              />
              <p className="text-[10px] text-muted-foreground">
                Cruciale per le punizioni centrali.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Uomini sui pali</Label>
              <Controller
                control={form.control}
                name="uomini_sui_pali"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {UOMINI_SUI_PALI_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {UOMINI_SUI_PALI_LABEL[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Altezza linea difensiva</Label>
              <Controller
                control={form.control}
                name="altezza_linea_difensiva"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALTEZZA_LINEA_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {ALTEZZA_LINEA_LABEL[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-[10px] text-muted-foreground">
                Cruciale per le punizioni laterali.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="giocatori_in_transizione">
                Giocatori in transizione (+)
              </Label>
              <Input
                id="giocatori_in_transizione"
                type="number"
                min={0}
                max={11}
                placeholder="0–11"
                {...form.register("giocatori_in_transizione", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
              />
              <p className="text-[10px] text-muted-foreground">
                Quanti rimangono alti pronti al contropiede.
              </p>
            </div>
          </div>
        </FormSection>
      )}

      {/* § 5 Esito */}
      <FormSection
        title="Esito e sviluppo"
        description="Come è finita l'azione del piazzato."
      >
        <div className="space-y-2">
          <Label>Esito finale</Label>
          <Controller
            control={form.control}
            name="esito_finale"
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {ESITO_FINALE_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {ESITO_FINALE_LABEL[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="note_esito">Note sull&apos;esito</Label>
          <Textarea
            id="note_esito"
            rows={4}
            placeholder="Cosa è successo dopo l'esecuzione, perché ha funzionato o no…"
            {...form.register("note_esito")}
          />
        </div>
      </FormSection>

      {/* § 6 Media */}
      <FormSection
        title="Materiale multimediale"
        description="URL del video clip, dell'immagine della lavagna e del PDF di analisi."
      >
        <div className="space-y-2">
          <Label htmlFor="video_url">Video clip (URL)</Label>
          <Input
            id="video_url"
            type="url"
            placeholder="https://… (MP4, YouTube, Wyscout, ecc.)"
            {...form.register("video_url")}
          />
          <FieldError message={form.formState.errors.video_url?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lavagna_image_url">Lavagna tattica (URL immagine)</Label>
          <Input
            id="lavagna_image_url"
            type="url"
            placeholder="https://… link a immagine PNG/JPG"
            {...form.register("lavagna_image_url")}
          />
          <p className="text-[10px] text-muted-foreground">
            {/* TODO upload: in futuro upload diretto su bucket "set-pieces" */}
            L&apos;upload diretto sarà aggiunto in seguito.
          </p>
          <FieldError
            message={form.formState.errors.lavagna_image_url?.message}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pdf_url">Documento PDF (URL)</Label>
          <Input
            id="pdf_url"
            type="url"
            placeholder="https://… link al PDF"
            {...form.register("pdf_url")}
          />
          <FieldError message={form.formState.errors.pdf_url?.message} />
        </div>
      </FormSection>

      {/* Allegati (file reali su storage privato) */}
      <FormSection
        title="Allegati"
        description="Carica file reali (video, PDF, slide, immagini…) oltre ai link."
      >
        <AttachmentsField
          entityType="set_piece"
          entityId={null}
          pending={pendingAttachments}
          onPendingChange={setPendingAttachments}
        />
      </FormSection>

      <div className="flex items-center justify-end gap-2 pb-8">
        <Button
          type="button"
          variant="ghost"
          disabled={submitting}
          onClick={() => router.push("/set-pieces")}
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
              Salva schema
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
