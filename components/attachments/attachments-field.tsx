"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  X,
  Trash2,
  Loader2,
  ExternalLink,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  listAttachments,
  deleteAttachment,
} from "@/app/(app)/attachments/actions";
import {
  ATTACHMENT_MAX_BYTES,
  humanFileSize,
  type AttachmentEntity,
  type AttachmentItem,
} from "@/lib/attachments/shared";

export type PendingAttachment = { uid: string; file: File };

export function AttachmentsField({
  entityType,
  entityId,
  pending,
  onPendingChange,
}: {
  entityType: AttachmentEntity;
  /** null in creazione: i file restano "pending" finché l'entità non esiste. */
  entityId: string | null;
  pending: PendingAttachment[];
  onPendingChange: (next: PendingAttachment[]) => void;
}) {
  const [existing, setExisting] = useState<AttachmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!entityId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const items = await listAttachments(entityType, entityId);
        if (active) setExisting(items);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [entityType, entityId]);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const accepted: PendingAttachment[] = [];
      const errs: string[] = [];
      Array.from(incoming).forEach((file) => {
        if (file.size > ATTACHMENT_MAX_BYTES) {
          errs.push(`${file.name} supera 500 MB.`);
          return;
        }
        accepted.push({ uid: crypto.randomUUID(), file });
      });
      setErrors(errs);
      if (accepted.length) onPendingChange([...pending, ...accepted]);
    },
    [pending, onPendingChange],
  );

  async function handleDelete(id: string) {
    const prev = existing;
    setExisting((cur) => cur.filter((f) => f.id !== id));
    try {
      await deleteAttachment(id);
      toast.success("Allegato eliminato");
    } catch (err) {
      setExisting(prev);
      const message = err instanceof Error ? err.message : "Errore";
      toast.error("Eliminazione fallita", { description: message });
    }
  }

  return (
    <div className="space-y-3">
      {/* File già caricati (solo in modifica) */}
      {entityId && (
        <div className="space-y-2">
          {loading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Carico gli allegati…
            </p>
          ) : existing.length > 0 ? (
            <ul className="space-y-2">
              {existing.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Paperclip className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={f.file_name}>
                      {f.file_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {humanFileSize(f.file_size_bytes)}
                    </p>
                  </div>
                  {f.signed_url && (
                    <a
                      href={f.signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Apri ${f.file_name}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {f.can_delete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id)}
                      aria-label={`Elimina ${f.file_name}`}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {/* Dropzone nuovi file */}
      <label
        htmlFor={`att-input-${entityType}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-8 px-6 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-card/30 hover:border-primary/50 hover:bg-card/50",
        )}
      >
        <UploadCloud className="h-6 w-6 text-muted-foreground" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            Trascina i file qui, oppure clicca per sceglierli
          </p>
          <p className="text-xs text-muted-foreground">
            Video · PDF · Slide · Excel · immagini · max 500 MB per file
          </p>
        </div>
        <input
          ref={inputRef}
          id={`att-input-${entityType}`}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {errors.length > 0 && (
        <ul className="space-y-1 text-xs text-destructive">
          {errors.map((err, i) => (
            <li key={i}>• {err}</li>
          ))}
        </ul>
      )}

      {/* File in attesa di caricamento (verranno caricati al salvataggio) */}
      {pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map((pf) => (
            <li
              key={pf.uid}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Paperclip className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={pf.file.name}>
                  {pf.file.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {humanFileSize(pf.file.size)} · da caricare
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onPendingChange(pending.filter((p) => p.uid !== pf.uid))
                }
                aria-label={`Rimuovi ${pf.file.name}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
