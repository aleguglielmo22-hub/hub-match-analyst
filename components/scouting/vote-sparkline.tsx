import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

const W = 240;
const H = 56;
const PAD = 8;

// Riempimento dei punti nella scala voti (classi intere perché Tailwind le trovi).
const VOTO_FILL = [
  "fill-tone-voto-1", "fill-tone-voto-2", "fill-tone-voto-3", "fill-tone-voto-4", "fill-tone-voto-5",
  "fill-tone-voto-6", "fill-tone-voto-7", "fill-tone-voto-8", "fill-tone-voto-9", "fill-tone-voto-10",
];
const votoFill = (v: number) => VOTO_FILL[Math.min(10, Math.max(1, Math.round(v))) - 1];

/**
 * Andamento dei voti (una sola serie, scala fissa 1-10). Linea sottile nel
 * colore primario, punti nei colori della scala voti; data e voto al
 * passaggio del mouse (area di tocco più grande del punto). Lo storico sotto
 * il grafico fa da tabella dei valori.
 */
export function VoteSparkline({ points }: { points: { date: string; voto: number }[] }) {
  if (points.length < 2) return null;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (points.length - 1);
  const y = (v: number) => PAD + ((10 - v) * (H - PAD * 2)) / 9;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.voto).toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure className="space-y-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-14 w-full max-w-60 overflow-visible"
        role="img"
        aria-label={`Andamento dei voti: da ${first.voto} a ${last.voto} in ${points.length} osservazioni`}
      >
        {/* Riferimento al 6 (sufficienza), recessivo. */}
        <line x1={PAD} x2={W - PAD} y1={y(6)} y2={y(6)} className="stroke-border" strokeDasharray="2 3" strokeWidth={1} />
        <path d={path} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={`${p.date}-${i}`}>
            <circle
              cx={x(i)}
              cy={y(p.voto)}
              r={4}
              className={cn("stroke-background", votoFill(p.voto))}
              strokeWidth={2}
            />
            <circle cx={x(i)} cy={y(p.voto)} r={10} fill="transparent">
              <title>{`${format(parseISO(p.date), "d MMM yyyy", { locale: it })}: voto ${p.voto}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <figcaption className="text-[10px] text-muted-foreground">
        Andamento dei voti · linea tratteggiata = 6
      </figcaption>
    </figure>
  );
}
