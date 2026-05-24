import {
  Download,
  Video,
  Film,
  FileText,
  Presentation,
  FileSpreadsheet,
  File as FileIcon,
  type LucideIcon,
} from "lucide-react";
import {
  TIPO_MEDIA_LABEL,
  type TipoMediaEnum,
} from "@/lib/types/archivio";
import type { ArchiveExistingFile } from "@/app/(app)/archivio/types";

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

function FileFrame({ file }: { file: ArchiveExistingFile }) {
  const Icon = ICON[file.tipo_media] ?? FileIcon;
  const url = file.signed_url;
  const mime = file.mime_type ?? "";

  if (!url) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
        Impossibile generare l&apos;URL temporaneo per {file.file_name}.
      </div>
    );
  }

  const isVideo = mime.startsWith("video/");
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf";

  return (
    <article className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <header className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-medium"
            title={file.file_name}
          >
            {file.file_name}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {TIPO_MEDIA_LABEL[file.tipo_media]}
            {file.file_size_bytes ? ` · ${humanSize(file.file_size_bytes)}` : ""}
          </p>
        </div>
        <a
          href={url}
          download={file.file_name}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card/30 px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          Scarica
        </a>
      </header>

      {isVideo && (
        <video
          controls
          preload="metadata"
          className="block w-full bg-black"
          src={url}
        />
      )}

      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={file.file_name}
          className="block w-full max-h-[640px] object-contain bg-black/40"
        />
      )}

      {isPdf && (
        <iframe
          src={`${url}#toolbar=1`}
          title={file.file_name}
          className="block h-[60vh] w-full bg-black/30"
        />
      )}

      {!isVideo && !isImage && !isPdf && (
        <div className="grid place-items-center gap-2 px-6 py-10 text-center">
          <Icon className="h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            Anteprima non disponibile per questo tipo di file.
          </p>
          <a
            href={url}
            download={file.file_name}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" />
            Scarica {file.file_name}
          </a>
        </div>
      )}
    </article>
  );
}

export function ArchiveFilesViewer({
  files,
}: {
  files: ArchiveExistingFile[];
}) {
  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-6 text-center text-sm text-muted-foreground">
        Nessun file allegato a questa voce.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {files.map((f) => (
        <FileFrame key={f.id} file={f} />
      ))}
    </div>
  );
}
