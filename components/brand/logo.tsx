import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Simbolo del logo AG (lettere inclinate con la scia arancio), stesse forme
 * di public/brand/simbolo-colori-su-*.svg. Lettere nel colore del tema
 * (--brand-ink: #141414 su chiaro, bianco su scuro), scia --brand-orange.
 * `onDark`: sulle barre di navigazione, scure in entrambi i temi.
 * `size` = altezza in pixel (il simbolo è largo circa 2,3 volte).
 */
export function LogoMark({
  size = 32,
  onDark = false,
  title,
  className,
}: {
  size?: number;
  onDark?: boolean;
  /** Testo alternativo; senza titolo il simbolo è decorativo. */
  title?: string;
  className?: string;
}) {
  const maskId = `ag-mask-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="-22 -2 240 104"
      height={size}
      width={Math.round((size * 240) / 104)}
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-200" y="-200" width="700" height="500">
          <rect x="-200" y="-200" width="700" height="500" fill="#fff" />
          {/* Spazio attorno alla scia (taglio nelle lettere); più largo se piccolo, come nel favicon. */}
          <polygon
            fill="#000"
            stroke="#000"
            strokeWidth={size < 20 ? 14 : 9}
            strokeLinejoin="miter"
            points="-14,58 61.2,58 67.6,76 -26,76"
          />
        </mask>
      </defs>
      <g transform="translate(25 0) skewX(-14)">
        {/* Contorno sottile dello stesso colore: niente righe dove le forme si toccano. */}
        <g
          mask={`url(#${maskId})`}
          strokeWidth={0.6}
          style={{
            fill: onDark ? "var(--brand-ink-on-dark)" : "var(--brand-ink)",
            stroke: onDark ? "var(--brand-ink-on-dark)" : "var(--brand-ink)",
          }}
        >
          <polygon points="0,100 34,0 66,0 100,100 76,100 50,26 24,100" />
          <polygon points="92.5,78 96,78 118,100 100,100" />
          <polygon points="190,0 118,0 96,22 96,78 118,100 186,100 186,44 140,44 140,62 164,62 164,78 128,78 118,68 118,32 128,22 184,22" />
        </g>
        <polygon style={{ fill: "var(--brand-orange)" }} points="-14,58 61.2,58 67.6,76 -26,76" />
      </g>
    </svg>
  );
}

/** Logo completo: simbolo + nome. Il colore del nome segue il testo circostante. */
export function Logo({
  size = 22,
  subtitle,
  onDark = false,
  className,
}: {
  size?: number;
  subtitle?: string;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} onDark={onDark} />
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
