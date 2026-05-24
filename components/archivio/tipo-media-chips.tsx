"use client";

import {
  Video,
  Film,
  FileText,
  Presentation,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TIPO_MEDIA_LABEL,
  type TipoMediaEnum,
} from "@/lib/types/archivio";
import { TIPO_MEDIA_VALUES } from "@/lib/schemas/archivio";

const ICON: Record<TipoMediaEnum, LucideIcon> = {
  VIDEO_CLIP: Video,
  INTERA_PARTITA: Film,
  PDF_REPORT: FileText,
  SLIDE_PRESENTAZIONE: Presentation,
  EXCEL_DATI: FileSpreadsheet,
};

export function TipoMediaChips({
  value,
  onChange,
}: {
  value: TipoMediaEnum[];
  onChange: (next: TipoMediaEnum[]) => void;
}) {
  function toggle(tipo: TipoMediaEnum) {
    if (value.includes(tipo)) {
      onChange(value.filter((v) => v !== tipo));
    } else {
      onChange([...value, tipo]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {TIPO_MEDIA_VALUES.map((tipo) => {
        const Icon = ICON[tipo];
        const active = value.includes(tipo);
        return (
          <button
            key={tipo}
            type="button"
            onClick={() => toggle(tipo)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-card/30 text-muted-foreground hover:border-border/80 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{TIPO_MEDIA_LABEL[tipo]}</span>
          </button>
        );
      })}
    </div>
  );
}
