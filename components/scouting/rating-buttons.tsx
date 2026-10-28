"use client";

import { cn } from "@/lib/utils";
import { TONE, ratingTone } from "@/lib/tones";

const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Voto 1-10 con un tocco: 10 pulsanti compatti nei colori della scala voti.
 * Toccare il voto scelto lo cancella (= non valutato).
 * Tastiera: la fila è un solo elemento nel Tab; 1-9 e 0 (=10) scelgono,
 * frecce ←/→ cambiano di uno, Canc/Backspace cancella.
 */
export function RatingButtons({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    let next: number | null | undefined;
    if (/^[0-9]$/.test(e.key)) next = e.key === "0" ? 10 : Number(e.key);
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(10, (value ?? 0) + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = value ? Math.max(1, value - 1) : 1;
    else if (e.key === "Backspace" || e.key === "Delete") next = null;
    if (next === undefined) return;
    e.preventDefault();
    onChange(next);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span id={`${id}-label`} className="text-xs text-foreground/80">
          {label}
        </span>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            value ? TONE[ratingTone(value)].text : "text-muted-foreground/60",
          )}
        >
          {value ?? "—"}
        </span>
      </div>
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="grid grid-cols-10 gap-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {VALUES.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${label}: ${n}`}
              tabIndex={-1}
              onClick={() => onChange(selected ? null : n)}
              className={cn(
                "h-11 min-w-0 rounded-md text-xs font-semibold tabular-nums transition-colors md:h-8",
                selected
                  ? cn("ring-2", TONE[ratingTone(n)].badge)
                  : "bg-muted/40 text-muted-foreground ring-1 ring-border/40 hover:bg-muted hover:text-foreground",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
