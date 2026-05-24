import Link from "next/link";
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Play,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MACRO_FASE_BADGE,
  MACRO_FASE_LABEL,
  SOTTO_FASE_LABEL,
  type SituationalListItem,
} from "@/lib/types/situational";

/**
 * Card del catalogo Situazionali.
 * Anteprima: lavagna (immagine) > video > fallback con icona.
 * Badge macro-fase colorato (verde/rosso/blu/giallo come da specs).
 */
export function SituationalCard({ item }: { item: SituationalListItem }) {
  const macro = MACRO_FASE_BADGE[item.macro_fase];

  return (
    <Link
      href={`/situational/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:border-primary/40 hover:bg-card/80 hover:shadow-lg hover:shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Anteprima media */}
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950">
        {item.lavagna_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.lavagna_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
          />
        ) : item.video_url ? (
          <div className="flex h-full items-center justify-center">
            <Play className="h-10 w-10 text-muted-foreground/40" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Badge macro-fase in alto a sx */}
        <span
          className={cn(
            "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 backdrop-blur-sm",
            macro.bg,
            macro.text,
            macro.ring,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", macro.dot)} />
          {MACRO_FASE_LABEL[item.macro_fase]}
        </span>

        {/* Indicatori media in basso a dx */}
        <div className="absolute bottom-3 right-3 flex gap-1">
          {item.video_url && (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
              <Play className="h-2.5 w-2.5" />
              Video
            </span>
          )}
          {item.pdf_url && (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
              <FileText className="h-2.5 w-2.5" />
              PDF
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {SOTTO_FASE_LABEL[item.sotto_fase]}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
          {item.titolo}
        </h3>

        {/* Numero giocatori + autori */}
        <div className="mt-1 space-y-1 text-[11px]">
          {item.numero_giocatori.length > 0 && (
            <p className="inline-flex items-center gap-1.5 text-foreground/80">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">
                {item.numero_giocatori.join(" · ")}
              </span>
            </p>
          )}
          {item.autori.length > 0 && (
            <p className="truncate text-muted-foreground">
              {item.autori.join(" · ")}
            </p>
          )}
        </div>

        {/* Focus tags (max 3 visibili) */}
        {item.focus_tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-1">
            {item.focus_tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
              >
                {t}
              </span>
            ))}
            {item.focus_tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{item.focus_tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

// Solo per evitare lint unused: ExternalLink resta esportato per future varianti.
void ExternalLink;
