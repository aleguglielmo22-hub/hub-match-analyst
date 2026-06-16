"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Save, X } from "lucide-react";

import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AMBITO_VALUES,
  CATEGORIA_LAVORO_VALUES,
  SORGENTE_VIDEO_VALUES,
  archiveFormSchema,
  type ArchiveFormValues,
} from "@/lib/schemas/archivio";
import {
  AMBITO_LABEL,
  CATEGORIA_LAVORO_LABEL,
  SORGENTE_VIDEO_LABEL,
  type TipoMediaEnum,
} from "@/lib/types/archivio";
import {
  createArchiveItem,
  createCompetition,
  createSeason,
  createTag,
  createTeam,
  updateArchiveItem,
  type LookupOption,
} from "@/app/(app)/archivio/actions";
import type { ArchiveExistingFile } from "@/app/(app)/archivio/types";

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
import { TipoMediaChips } from "@/components/archivio/tipo-media-chips";
import { TagInput } from "@/components/archivio/tag-input";
import {
  FileDropzone,
  type PendingFile,
} from "@/components/archivio/file-dropzone";
import {
  ExistingFilesList,
  type ExistingFileState,
} from "@/components/archivio/existing-files-list";

function slugifyFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : "";
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "file"}${ext}`;
}

type ExistingPayload = {
  id: string;
  values: ArchiveFormValues;
  files: ArchiveExistingFile[];
};

type Props = {
  workspaceId: string;
  initialLookups: {
    teams: LookupOption[];
    competitions: LookupOption[];
    seasons: LookupOption[];
    tags: LookupOption[];
  };
  /** Se presente, il form è in modalità modifica. */
  existing?: ExistingPayload;
};

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

export function ArchiveForm({ workspaceId, initialLookups, existing }: Props) {
  const router = useRouter();
  const isEdit = !!existing;

  const [files, setFiles] = useState<PendingFile[]>([]);
  const [existingFiles, setExistingFiles] = useState<ExistingFileState[]>(() =>
    (existing?.files ?? []).map((f) => ({
      id: f.id,
      file_name: f.file_name,
      file_size_bytes: f.file_size_bytes,
      mime_type: f.mime_type,
      original_tipo_media: f.tipo_media,
      current_tipo_media: f.tipo_media,
      removed: false,
    })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [lookups, setLookups] = useState(initialLookups);

  const defaultValues = useMemo<Partial<ArchiveFormValues>>(() => {
    if (existing) return existing.values;
    return {
      data_lavoro: new Date().toISOString().slice(0, 10),
      season_id: null,
      team_principale_id: null,
      team_avversario_id: null,
      competition_id: null,
      ambito: undefined,
      categoria_lavoro: undefined,
      tipo_media: [],
      sorgente_video: null,
      titolo_archivio: "",
      descrizione_estesa: "",
      tag_ids: [],
    };
  }, [existing]);

  const form = useForm<ArchiveFormValues>({
    resolver: zodResolver(archiveFormSchema),
    defaultValues,
  });

  const watchTipoMedia = form.watch("tipo_media");
  const needsSorgente =
    watchTipoMedia.includes("VIDEO_CLIP") ||
    watchTipoMedia.includes("INTERA_PARTITA");

  async function uploadPendingFiles(
    archiveId: string,
    startPosition: number,
  ) {
    if (files.length === 0) return [];
    const supabase = createSupabaseBrowserClient();
    return Promise.all(
      files.map(async (pf, i) => {
        const fileId = crypto.randomUUID();
        const path = `${workspaceId}/${archiveId}/${fileId}-${slugifyFilename(pf.file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("archivio")
          .upload(path, pf.file, {
            cacheControl: "3600",
            contentType: pf.file.type || undefined,
            upsert: false,
          });
        if (uploadError) {
          throw new Error(
            `Upload "${pf.file.name}" fallito: ${uploadError.message}`,
          );
        }
        return {
          file_name: pf.file.name,
          file_path: path,
          file_size_bytes: pf.file.size,
          mime_type: pf.file.type || null,
          tipo_media: pf.tipo_media,
          posizione: startPosition + i,
        };
      }),
    );
  }

  async function onSubmit(values: ArchiveFormValues) {
    setSubmitting(true);

    try {
      if (isEdit && existing) {
        // Calcola diff sui file esistenti
        const remove_file_ids = existingFiles
          .filter((f) => f.removed)
          .map((f) => f.id);
        const update_file_tipi = existingFiles
          .filter(
            (f) => !f.removed && f.current_tipo_media !== f.original_tipo_media,
          )
          .map((f) => ({ id: f.id, tipo_media: f.current_tipo_media }));

        const keptCount = existingFiles.filter((f) => !f.removed).length;
        const new_files = await uploadPendingFiles(existing.id, keptCount);

        await updateArchiveItem({
          id: existing.id,
          data_lavoro: values.data_lavoro,
          season_id: values.season_id ?? null,
          team_principale_id: values.team_principale_id ?? null,
          team_avversario_id: values.team_avversario_id ?? null,
          competition_id: values.competition_id ?? null,
          ambito: values.ambito,
          categoria_lavoro: values.categoria_lavoro,
          tipo_media: values.tipo_media,
          sorgente_video: needsSorgente
            ? (values.sorgente_video ?? null)
            : null,
          titolo_archivio: values.titolo_archivio.trim(),
          descrizione_estesa: values.descrizione_estesa?.trim() || null,
          tag_ids: values.tag_ids,
          new_files,
          remove_file_ids,
          update_file_tipi,
        });

        toast.success("Modifiche salvate");
        router.push(`/archivio/${existing.id}`);
        router.refresh();
      } else {
        const archiveId = crypto.randomUUID();
        const uploaded = await uploadPendingFiles(archiveId, 0);

        await createArchiveItem({
          id: archiveId,
          data_lavoro: values.data_lavoro,
          season_id: values.season_id ?? null,
          team_principale_id: values.team_principale_id ?? null,
          team_avversario_id: values.team_avversario_id ?? null,
          competition_id: values.competition_id ?? null,
          ambito: values.ambito,
          categoria_lavoro: values.categoria_lavoro,
          tipo_media: values.tipo_media,
          sorgente_video: needsSorgente
            ? (values.sorgente_video ?? null)
            : null,
          titolo_archivio: values.titolo_archivio.trim(),
          descrizione_estesa: values.descrizione_estesa?.trim() || null,
          files: uploaded,
          tag_ids: values.tag_ids,
        });

        toast.success("Voce salvata");
        router.push(`/archivio/${archiveId}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      toast.error("Salvataggio fallito", { description: message });
      setSubmitting(false);
    }
  }

  const cancelHref = existing ? `/archivio/${existing.id}` : "/archivio";
  const headerLabel = isEdit ? "Modifica voce" : "Nuova voce";
  const submitLabel = isEdit ? "Salva modifiche" : "Salva voce";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href={cancelHref}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isEdit ? "Torna al dettaglio" : "Torna al Cloud"}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {headerLabel}
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
                {submitLabel}
              </>
            )}
          </Button>
        </div>
      </header>

      {/* METADATI */}
      <FormSection
        title="Metadati"
        description="Quando è stato fatto il lavoro e a quale stagione appartiene."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="data_lavoro">Data del lavoro *</Label>
            <Input
              id="data_lavoro"
              type="date"
              {...form.register("data_lavoro")}
            />
            <FieldError
              message={form.formState.errors.data_lavoro?.message}
            />
          </div>
          <div className="space-y-2">
            <Label>Stagione</Label>
            <Controller
              control={form.control}
              name="season_id"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? null}
                  onChange={field.onChange}
                  options={lookups.seasons}
                  placeholder="Es. 2025/2026"
                  onCreate={createSeason}
                  onCreated={(opt) =>
                    setLookups((l) => ({ ...l, seasons: [opt, ...l.seasons] }))
                  }
                />
              )}
            />
          </div>
        </div>
      </FormSection>

      {/* CONTESTO */}
      <FormSection
        title="Contesto"
        description="Squadre coinvolte, competizione e ambito."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Squadra principale</Label>
            <Controller
              control={form.control}
              name="team_principale_id"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? null}
                  onChange={field.onChange}
                  options={lookups.teams}
                  placeholder="Cerca o crea…"
                  onCreate={createTeam}
                  onCreated={(opt) =>
                    setLookups((l) => ({
                      ...l,
                      teams: [...l.teams, opt].sort((a, b) =>
                        a.label.localeCompare(b.label),
                      ),
                    }))
                  }
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Squadra avversaria</Label>
            <Controller
              control={form.control}
              name="team_avversario_id"
              render={({ field, fieldState }) => (
                <>
                  <Combobox
                    value={field.value ?? null}
                    onChange={field.onChange}
                    options={lookups.teams}
                    placeholder="Cerca o crea…"
                    onCreate={createTeam}
                    onCreated={(opt) =>
                      setLookups((l) => ({
                        ...l,
                        teams: [...l.teams, opt].sort((a, b) =>
                          a.label.localeCompare(b.label),
                        ),
                      }))
                    }
                  />
                  <FieldError message={fieldState.error?.message} />
                </>
              )}
            />
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
                    setLookups((l) => ({
                      ...l,
                      competitions: [...l.competitions, opt].sort((a, b) =>
                        a.label.localeCompare(b.label),
                      ),
                    }))
                  }
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Ambito *</Label>
            <Controller
              control={form.control}
              name="ambito"
              render={({ field, fieldState }) => (
                <>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => v && field.onChange(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Scegli un ambito" />
                    </SelectTrigger>
                    <SelectContent>
                      {AMBITO_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {AMBITO_LABEL[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldState.error?.message} />
                </>
              )}
            />
          </div>
        </div>
      </FormSection>

      {/* CATEGORIA */}
      <FormSection
        title="Categoria"
        description="Che tipo di lavoro è e con quali media."
      >
        <div className="space-y-2">
          <Label>Categoria lavoro *</Label>
          <Controller
            control={form.control}
            name="categoria_lavoro"
            render={({ field, fieldState }) => (
              <>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => v && field.onChange(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli una categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIA_LAVORO_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {CATEGORIA_LAVORO_LABEL[v]}
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
          <Label>Tipo media *</Label>
          <p className="text-xs text-muted-foreground">
            Seleziona uno o più formati presenti in questa voce.
          </p>
          <Controller
            control={form.control}
            name="tipo_media"
            render={({ field, fieldState }) => (
              <>
                <TipoMediaChips
                  value={field.value as TipoMediaEnum[]}
                  onChange={field.onChange}
                />
                <FieldError message={fieldState.error?.message} />
              </>
            )}
          />
        </div>

        {needsSorgente && (
          <div className="space-y-2">
            <Label>Sorgente video</Label>
            <Controller
              control={form.control}
              name="sorgente_video"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Da dove arrivano le immagini?" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORGENTE_VIDEO_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {SORGENTE_VIDEO_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}
      </FormSection>

      {/* DESCRIZIONE */}
      <FormSection
        title="Descrizione"
        description="Come riconoscerai questa voce tra 6 mesi."
      >
        <div className="space-y-2">
          <Label htmlFor="titolo_archivio">Titolo *</Label>
          <Input
            id="titolo_archivio"
            placeholder="Es. Press alta — Inter vs Milan 2025-10-12"
            {...form.register("titolo_archivio")}
          />
          <FieldError
            message={form.formState.errors.titolo_archivio?.message}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="descrizione_estesa">Descrizione estesa</Label>
          <Textarea
            id="descrizione_estesa"
            rows={5}
            placeholder="Note libere: insegnamenti, riferimenti, contesto…"
            {...form.register("descrizione_estesa")}
          />
        </div>
      </FormSection>

      {/* FILE */}
      <FormSection
        title="File"
        description={
          isEdit
            ? "Gestisci gli allegati esistenti e aggiungine di nuovi."
            : "Trascina o seleziona i file da allegare. Verranno caricati al salvataggio."
        }
      >
        {isEdit && (
          <ExistingFilesList
            files={existingFiles}
            onChange={setExistingFiles}
          />
        )}
        <FileDropzone files={files} onChange={setFiles} />
      </FormSection>

      {/* TAG */}
      <FormSection
        title="Tag liberi"
        description="Etichette personali per ritrovare la voce (es. press, palla-inattiva, set-piece)."
      >
        <Controller
          control={form.control}
          name="tag_ids"
          render={({ field }) => (
            <TagInput
              value={field.value}
              onChange={field.onChange}
              options={lookups.tags}
              onCreate={createTag}
              onCreated={(opt) =>
                setLookups((l) => ({
                  ...l,
                  tags: [...l.tags, opt].sort((a, b) =>
                    a.label.localeCompare(b.label),
                  ),
                }))
              }
            />
          )}
        />
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
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
