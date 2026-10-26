import { ExternalLink } from "lucide-react";
import {
  detectLinkSource,
  LINK_SOURCE_LABEL,
  videoEmbedUrl,
} from "@/lib/links/external-links";
import type { ArchiveLink } from "@/app/(app)/archivio/types";
import { LinkSourceIcon } from "./link-source-icon";

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Link esterni della voce: pulsanti con icona + anteprima per YouTube/Vimeo. */
export function ArchiveLinks({ links }: { links: ArchiveLink[] }) {
  const embeds = links.flatMap((l) => {
    const src = videoEmbedUrl(l.url);
    return src ? [{ id: l.id, src, title: l.etichetta ?? LINK_SOURCE_LABEL[detectLinkSource(l.url)] }] : [];
  });

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-2">
        {links.map((l) => {
          const source = detectLinkSource(l.url);
          const sourceLabel =
            source === "altro" ? hostLabel(l.url) : LINK_SOURCE_LABEL[source];
          return (
            <li key={l.id} className="min-w-0 max-w-full">
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 max-w-full items-center gap-2.5 rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-card/70"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <LinkSourceIcon source={source} className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {l.etichetta ?? sourceLabel}
                  </span>
                  {l.etichetta && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {sourceLabel}
                    </span>
                  )}
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
            </li>
          );
        })}
      </ul>

      {embeds.map((e) => (
        <iframe
          key={e.id}
          src={e.src}
          title={e.title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-overlay"
        />
      ))}
    </div>
  );
}
