"use client";

import {
  RotateCcw,
  Trash2,
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

export type ExistingFileState = {
  id: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  original_tipo_media: TipoMediaEnum;
  current_tipo_media: TipoMediaEnum;
  removed: boolean;
};

const ICON: Record<TipoMediaEnum, LucideIcon> = {
  VIDEO_CLIP: Video,
  INTERA_PARTITA: Film,
  PDF_REPORT: FileText,
  SLIDE_PRESENTAZIONE: Presentation,
  EXCEL_DATI: FileSpreadsheet,
};

function humanSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function ExistingFilesList({
  files,
  onChange,
}: {
  files: ExistingFileState[];
  onChange: (next: ExistingFileState[]) => void;
}) {
  if (files.length === 0) return null;

  function patch(id: string, p: Partial<ExistingFileState>) {
    onChange(files.map((f) => (f.id === id ? { ...f, ...p } : f)));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        File già caricati. Puoi cambiare il loro tipo o rimuoverli.
      </p>
      <ul className="space-y-2">
        {files.map((f) => {
          const Icon = ICON[f.current_tipo_media] ?? FileIcon;
          return (
            <li
              key={f.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                f.removed
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border/60 bg-card/40",
              )}
            >
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                  f.removed
                    ? "bg-destructive/15 text-destructive"
                    : "bg-primary/10 text-primary",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p
                  className={cn(
                    "truncate text-sm font-medium",
                    f.removed && "line-through opacity-70",
                  )}
                  title={f.file_name}
                >
                  {f.file_name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {humanSize(f.file_size_bytes)}
                  {f.removed ? " · da rimuovere" : ""}
                </p>
              </div>
              <div className="w-44 shrink-0">
                <Select
                  value={f.current_tipo_media}
                  disabled={f.removed}
                  onValueChange={(v) =>
                    v && patch(f.id, { current_tipo_media: v as TipoMediaEnum })
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
                onClick={() => patch(f.id, { removed: !f.removed })}
                aria-label={f.removed ? "Annulla rimozione" : "Rimuovi file"}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  f.removed
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                    : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                )}
              >
                {f.removed ? (
                  <RotateCcw className="h-4 w-4" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
