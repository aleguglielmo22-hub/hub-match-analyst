"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/**
 * Slider 0-10 per filtri valutazioni.
 * 0 = nessun filtro; 1-10 = "mostrami chi ha ≥ N".
 */
export function RatingSlider({
  label,
  value,
  onChange,
  groupColor,
}: {
  label: string;
  value: number; // 0 = off
  onChange: (next: number) => void;
  groupColor?: "emerald" | "rose" | "sky";
}) {
  const active = value > 0;
  const colorRing =
    groupColor === "rose"
      ? "ring-rose-400/30"
      : groupColor === "sky"
        ? "ring-sky-400/30"
        : "ring-emerald-400/30";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-sidebar-foreground/80">{label}</span>
        <span
          className={cn(
            "inline-flex h-5 min-w-[2.25rem] items-center justify-center rounded-md px-1.5 text-[10px] font-semibold tabular-nums ring-1",
            active
              ? `bg-primary/15 text-primary ${colorRing}`
              : "bg-muted/40 text-muted-foreground ring-border/40",
          )}
        >
          {active ? `≥ ${value}` : "off"}
        </span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={10}
        step={1}
        onValueChange={(v) => {
          const arr = Array.isArray(v) ? v : [];
          if (typeof arr[0] === "number") onChange(arr[0]);
        }}
      />
    </div>
  );
}
