import { useId } from "react";

/**
 * Simbolo AG (stesse forme di public/brand/simbolo-colori-su-*.svg di AG
 * Workspace). `onDark`: lettere bianche, per le barre scure. `size` = altezza.
 */
export function LogoMark({ size = 24, onDark = false }: { size?: number; onDark?: boolean }) {
  const mask = `ag-${useId().replace(/:/g, "")}`;
  const ink = onDark ? "var(--brand-ink-on-dark)" : "var(--brand-ink)";
  return (
    <svg viewBox="-22 -2 240 104" height={size} width={Math.round((size * 240) / 104)} aria-hidden>
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x="-200" y="-200" width="700" height="500">
          <rect x="-200" y="-200" width="700" height="500" fill="#fff" />
          <polygon fill="#000" stroke="#000" strokeWidth={9} strokeLinejoin="miter" points="-14,58 61.2,58 67.6,76 -26,76" />
        </mask>
      </defs>
      <g transform="translate(25 0) skewX(-14)">
        <g mask={`url(#${mask})`} strokeWidth={0.6} style={{ fill: ink, stroke: ink }}>
          <polygon points="0,100 34,0 66,0 100,100 76,100 50,26 24,100" />
          <polygon points="92.5,78 96,78 118,100 100,100" />
          <polygon points="190,0 118,0 96,22 96,78 118,100 186,100 186,44 140,44 140,62 164,62 164,78 128,78 118,68 118,32 128,22 184,22" />
        </g>
        <polygon style={{ fill: "var(--brand-orange)" }} points="-14,58 61.2,58 67.6,76 -26,76" />
      </g>
    </svg>
  );
}
