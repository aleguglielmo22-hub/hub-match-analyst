"use client";

/** Barra di avanzamento per i componenti nel browser (senza obiettivo: solo il valore). */
export function ProgressBarClient({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const over = max > 0 && value > max;
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={over ? "h-full rounded-full bg-tone-danger" : "h-full rounded-full bg-primary"} style={{ width: `${max > 0 ? pct : 0}%` }} />
      </div>
    </div>
  );
}
