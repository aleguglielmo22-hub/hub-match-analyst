import { Paperclip, Download } from "lucide-react";
import { listAttachments } from "@/app/(app)/attachments/actions";
import { humanFileSize, type AttachmentEntity } from "@/lib/attachments/shared";

/**
 * Sezione "Allegati" per le pagine di dettaglio.
 * Server component: legge gli allegati e genera i link firmati.
 * Non renderizza nulla se non ci sono file.
 */
export async function AttachmentsViewer({
  entityType,
  entityId,
}: {
  entityType: AttachmentEntity;
  entityId: string;
}) {
  const items = await listAttachments(entityType, entityId);
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <h2 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        Allegati ({items.length})
      </h2>
      <ul className="space-y-2">
        {items.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/30 px-3 py-2"
          >
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground/90" title={f.file_name}>
                {f.file_name}
              </p>
              {f.file_size_bytes != null && (
                <p className="text-[11px] text-muted-foreground">
                  {humanFileSize(f.file_size_bytes)}
                </p>
              )}
            </div>
            {f.signed_url && (
              <a
                href={f.signed_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10"
              >
                <Download className="h-3.5 w-3.5" />
                Apri
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
