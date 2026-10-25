import { cn } from "@/lib/utils";
import {
  BRAND_COLORS,
  LOGO,
  LOGO_SMALL,
  aPath,
  gPath,
} from "./logo-geometry";

/**
 * Simbolo del logo AG Workspace (riquadro navy con "AG").
 * `simplified`: per le dimensioni piccole (sotto ~24 px) omette il tratteggio
 * e ingrossa i tratti. Le icone PWA/favicon si generano con
 * scripts/generate-icons.mjs dalla stessa geometria.
 */
export function LogoMark({
  size = 32,
  simplified = size < 24,
  title,
  className,
}: {
  size?: number;
  simplified?: boolean;
  /** Testo alternativo; senza titolo il simbolo è decorativo. */
  title?: string;
  className?: string;
}) {
  const stroke = simplified ? LOGO_SMALL.stroke : LOGO.stroke;
  const nodeR = simplified ? LOGO_SMALL.nodeRadius : LOGO.nodeRadius;
  const { apex, left, right } = LOGO.a;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="100" height="100" rx={LOGO.tile.radius} fill={BRAND_COLORS.navy} />
      <g
        fill="none"
        stroke={BRAND_COLORS.white}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={aPath()} />
        <path d={gPath()} />
      </g>
      {!simplified &&
        LOGO.lane.dots.map((x) => (
          <circle
            key={x}
            cx={x}
            cy={LOGO.lane.y}
            r={LOGO.lane.radius}
            fill={BRAND_COLORS.lightBlue}
          />
        ))}
      {[apex, left, right].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={nodeR} fill={BRAND_COLORS.blue} />
      ))}
    </svg>
  );
}

/** Logo completo: simbolo + nome. Il colore del nome segue il testo circostante. */
export function Logo({
  size = 32,
  subtitle,
  className,
}: {
  size?: number;
  subtitle?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-tight">AG Workspace</span>
        {subtitle && (
          <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
