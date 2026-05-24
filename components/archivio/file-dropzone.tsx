"use client";

import { useCallback, useRef, useState } from "react";
import {
  UploadCloud,
  X,
  Video,
  Film,
  FileText,
  Presentation,
  FileSpreadsheet,
  File as FileIcon,
  type LucideIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  TIPO_MEDIA_LABEL,
  type TipoMediaEnum,
} from "@/lib/types/archivio";
import { TIPO_MEDIA_VALUES } from "@/lib/schemas/archivio";

export type PendingFile = {
  /** id locale, usato solo per la react key. */
  uid: string;
  file: File;
  tipo_media: TipoMediaEnum;
};

const ICON: Record<TipoMediaEnum, LucideIcon> = {
  VIDEO_CLIP: Video,
  INTERA_PARTITA: Film,
  PDF_REPORT: FileText,
  SLIDE_PRESENTAZIONE: Presentation,
  EXCEL_DATI: FileSpreadsheet,
};

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

function suggestTipoMedia(file: File): TipoMediaEnum {
  const mime = file.type;
  if (mime.startsWith("video/")) {
    // Heuristica: oltre 200 MB consideriamo "intera partita".
    return file.size > 200 * 1024 * 1024 ? "INTERA_PARTITA" : "VIDEO_CLIP";
  }
  if (mime === "application/pdf") return "PDF_REPORT";
  if (mime.includes("presentation")) return "SLIDE_PRESENTAZIONE";
  if (mime.includes("spreadsheet") || mime.includes("excel"))
    return "EXCEL_DATI";
  return "PDF_REPORT";
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function FileDropzone({
  files,
  onChange,
}: {
  files: PendingFile[];
  onChange: (next: PendingFile[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const accepted: PendingFile[] = [];
      const errs: string[] = [];

      Array.from(newFiles).forEach((file) => {
        if (file.size > MAX_BYTES) {
          errs.push(`${file.name} supera 500 MB.`);
          return;
        }
        accepted.push({
          uid: crypto.randomUUID(),
          file,
          tipo_media: suggestTipoMedia(file),
        });
      });

      setErrors(errs);
      if (accepted.length) onChange([...files, ...accepted]);
    },
    [files, onChange],
  );

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function updateTipo(uid: string, tipo: TipoMediaEnum) {
    onChange(files.map((f) => (f.uid === uid ? { ...f, tipo_media: tipo } : f)));
  }

  function remove(uid: string) {
    onChange(files.filter((f) => f.uid !== uid));
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor="file-input"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 px-6 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-card/30 hover:border-primary/50 hover:bg-card/50",
        )}
      >
        <UploadCloud className="h-7 w-7 text-muted-foreground" />
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
          id="file-input"
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

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((pf) => {
            const Icon = ICON[pf.tipo_media] ?? FileIcon;
            return (
              <li
                key={pf.uid}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p
                    className="truncate text-sm font-medium"
                    title={pf.file.name}
                  >
                    {pf.file.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {humanSize(pf.file.size)}
                  </p>
                </div>
                <div className="w-44 shrink-0">
                  <Select
                    value={pf.tipo_media}
                    onValueChange={(v) =>
                      v && updateTipo(pf.uid, v as TipoMediaEnum)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPO_MEDIA_VALUES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {TIPO_MEDIA_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => remove(pf.uid)}
                  aria-label={`Rimuovi ${pf.file.name}`}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
