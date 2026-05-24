import Link from "next/link";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  Video,
  Film,
  FileText,
  Presentation,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AMBITO_LABEL,
  CATEGORIA_LAVORO_LABEL,
  type TipoMediaEnum,
} from "@/lib/types/archivio";
import type { ArchiveListItem } from "@/app/(app)/archivio/types";

const TIPO_MEDIA_META: Record<
  TipoMediaEnum,
  { icon: LucideIcon; label: string; tint: string }
> = {
  VIDEO_CLIP: {
    icon: Video,
    label: "Clip",
    tint: "from-emerald-500/20 to-emerald-500/5 text-emerald-300",
  },
  INTERA_PARTITA: {
    icon: Film,
    label: "Partita",
    tint: "from-cyan-500/20 to-cyan-500/5 text-cyan-300",
  },
  PDF_REPORT: {
    icon: FileText,
    label: "PDF",
    tint: "from-rose-500/20 to-rose-500/5 text-rose-300",
  },
  SLIDE_PRESENTAZIONE: {
    icon: Presentation,
    label: "Slide",
    tint: "from-amber-500/20 to-amber-500/5 text-amber-300",
  },
  EXCEL_DATI: {
    icon: FileSpreadsheet,
    label: "Excel",
    tint: "from-violet-500/20 to-violet-500/5 text-violet-300",
  },
};

/** Riassunto della partita "X · Y" o solo "X" se mancano teams. */
function MatchupRow({ item }: { item: ArchiveListItem }) {
  const home = item.team_principale?.nome;
  const away = item.team_avversario?.nome;
  if (!home && !away) return null;

  return (
    <p className="truncate text-xs text-foreground/80">
      {home && <span className="font-medium">{home}</span>}
      {home && away && <span className="mx-1.5 text-muted-foreground">·</span>}
      {away && <span>{away}</span>}
    </p>
  );
}

export function ArchiveCard({ item }: { item: ArchiveListItem }) {
  const primaryMedia = item.tipo_media[0] ?? "PDF_REPORT";
  const meta = TIPO_MEDIA_META[primaryMedia];
  const Icon = meta.icon;

  const dataFormatted = format(parseISO(item.data_lavoro), "d MMM yyyy", {
    locale: it,
  });

  return (
    <Link
      href={`/archivio/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/50 transition-all hover:border-primary/40 hover:bg-card/80 hover:shadow-lg hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* banda colorata in alto in base al tipo media dominante */}
      <div
        className={`relative flex h-20 items-center justify-between bg-gradient-to-br px-4 ${meta.tint}`}
      >
        <Icon className="h-6 w-6 opacity-90" aria-hidden />
        <span className="text-[10px] uppercase tracking-[0.18em] font-semibold opacity-80">
          {meta.label}
        </span>
        {item.tipo_media.length > 1 && (
          <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/30 px-1.5 py-0.5 text-[9px] font-semibold text-white/90 backdrop-blur-sm">
            +{item.tipo_media.length - 1}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
            {item.titolo_archivio}
          </h3>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {dataFormatted}
          </p>
        </div>

        <MatchupRow item={item} />

        {item.competition?.nome && (
          <p className="truncate text-[11px] text-muted-foreground">
            {item.competition.nome}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          <Badge variant="secondary" className="text-[10px] font-medium">
            {CATEGORIA_LAVORO_LABEL[item.categoria_lavoro]}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-medium">
            {AMBITO_LABEL[item.ambito]}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
