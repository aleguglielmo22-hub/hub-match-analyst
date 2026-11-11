import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/hub/fields";

/**
 * Grafici semplici in SVG, leggibili in tema chiaro e scuro (currentColor e
 * variabili del tema). Nessuna libreria esterna.
 */

export function LineChart({
  points,
  unit,
  label,
  height = 120,
  className,
}: {
  points: { x: string; y: number }[];
  unit?: string;
  label: string;
  height?: number;
  className?: string;
}) {
  if (points.length === 0) {
    return <p className="text-xs text-muted-foreground">Nessun dato da mostrare.</p>;
  }
  const W = 600;
  const H = height;
  const pad = { l: 8, r: 8, t: 10, b: 18 };
  const ys = points.map((p) => p.y);
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const xs = points.map((p) => Date.parse(p.x));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs) || x0 + 1;
  const px = (t: number) => pad.l + ((t - x0) / Math.max(1, x1 - x0)) * (W - pad.l - pad.r);
  const py = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${px(Date.parse(p.x)).toFixed(1)},${py(p.y).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const fmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1).replace(".", ",")}${unit ? ` ${unit}` : ""}`;

  return (
    <figure className={cn("space-y-1", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full text-primary" role="img" aria-label={`${label}: ultimo valore ${fmt(last.y)}`}>
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--border)" strokeWidth="1" />
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.length <= 60 &&
          points.map((p) => <circle key={p.x} cx={px(Date.parse(p.x))} cy={py(p.y)} r="3" fill="currentColor" />)}
        <text x={pad.l} y={H - 4} fontSize="11" fill="var(--muted-foreground)">
          {formatDate(points[0].x)}
        </text>
        <text x={W - pad.r} y={H - 4} fontSize="11" fill="var(--muted-foreground)" textAnchor="end">
          {formatDate(last.x)}
        </text>
      </svg>
      <figcaption className="flex justify-between text-[11px] text-muted-foreground">
        <span>
          min {fmt(Math.min(...ys))} · max {fmt(Math.max(...ys))}
        </span>
        <span className="font-medium text-foreground">ultimo {fmt(last.y)}</span>
      </figcaption>
    </figure>
  );
}

/** Barre orizzontali (es. spese per categoria). */
export function HBars({
  bars,
  format,
}: {
  bars: { label: string; value: number; tone?: "success" | "danger" | "primary" }[];
  format: (v: number) => string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  if (bars.length === 0) return <p className="text-xs text-muted-foreground">Nessun dato da mostrare.</p>;
  return (
    <ul className="space-y-2">
      {bars.map((b) => (
        <li key={b.label} className="text-xs">
          <div className="mb-0.5 flex justify-between gap-2">
            <span className="truncate">{b.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{format(b.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                b.tone === "success" ? "bg-tone-success" : b.tone === "danger" ? "bg-tone-danger" : "bg-primary",
              )}
              style={{ width: `${Math.max(2, (b.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Colonne affiancate per mese: entrate e uscite. */
export function MonthColumns({
  months,
  format,
}: {
  months: { label: string; entrate: number; uscite: number }[];
  format: (v: number) => string;
}) {
  const max = Math.max(1, ...months.flatMap((m) => [m.entrate, m.uscite]));
  return (
    <div className="space-y-2">
      <div className="flex h-40 items-end gap-1.5 sm:gap-3" role="img" aria-label="Entrate e uscite per mese">
        {months.map((m) => (
          <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end justify-center gap-0.5">
              <div
                className="w-1/2 max-w-4 rounded-t bg-tone-success"
                style={{ height: `${(m.entrate / max) * 100}%` }}
                title={`Entrate ${format(m.entrate)}`}
              />
              <div
                className="w-1/2 max-w-4 rounded-t bg-tone-danger"
                style={{ height: `${(m.uscite / max) * 100}%` }}
                title={`Uscite ${format(m.uscite)}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{m.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-tone-success" /> Entrate
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-tone-danger" /> Uscite
        </span>
      </div>
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
