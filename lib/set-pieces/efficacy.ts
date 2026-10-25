/**
 * Efficacia dei calci piazzati, separata per fase, dal punto di vista della
 * mia squadra. Il giudizio positivo/neutro/negativo di ogni esito arriva da
 * ESITO_TONE (lib/tones.ts), passato come argomento: un'unica fonte di verità.
 * Modulo puro, testato in efficacy.test.mjs.
 *
 *  - Offensivo: "riusciti" = esiti positivi (success).
 *  - Difensivo: "riusciti" = piazzati difesi senza esito negativo (≠ danger).
 *
 * Le percentuali si calcolano solo sui piazzati con esito tracciato: quelli
 * senza esito falserebbero la statistica e vengono contati a parte.
 */
import type { ESITO_TONE } from "@/lib/tones";
import type {
  EsitoFinaleEnum,
  FaseEnum,
  TipoPiazzatoEnum,
} from "@/lib/types/set-pieces";

export type EfficacyRow = {
  fase: FaseEnum;
  tipo_piazzato: TipoPiazzatoEnum;
  esito_finale: EsitoFinaleEnum | null;
};

export type EfficacyStats = {
  /** Piazzati con esito tracciato (base delle percentuali). */
  tracked: number;
  /** Offensivo: esiti positivi. Difensivo: esiti non negativi. */
  riusciti: number;
  /** Offensivo: gol fatti. Difensivo: gol subiti. */
  gol: number;
  /** null se non c'è nessun esito tracciato (mai 0% o NaN). */
  riuscitiPct: number | null;
  golPct: number | null;
};

export type PhaseEfficacy = EfficacyStats & {
  fase: FaseEnum;
  /** Tutti i piazzati della fase, anche senza esito. */
  total: number;
  /** Ripartizione per tipo, solo per i tipi con almeno un esito tracciato. */
  perTipo: (EfficacyStats & { tipo: TipoPiazzatoEnum })[];
};

export type SetPiecesEfficacy = Record<FaseEnum, PhaseEfficacy>;

const TIPO_ORDER: TipoPiazzatoEnum[] = [
  "ANGOLO",
  "PUNIZIONE",
  "RIMESSA_LATERALE",
  "RIGORE",
];

function pct(part: number, base: number): number | null {
  return base > 0 ? Math.round((part / base) * 100) : null;
}

function isRiuscito(
  fase: FaseEnum,
  esito: EsitoFinaleEnum,
  esitoTone: typeof ESITO_TONE,
): boolean {
  const tone = esitoTone[fase][esito];
  return fase === "OFFENSIVO" ? tone === "success" : tone !== "danger";
}

function stats(
  fase: FaseEnum,
  rows: EfficacyRow[],
  esitoTone: typeof ESITO_TONE,
): EfficacyStats {
  let tracked = 0;
  let riusciti = 0;
  let gol = 0;
  for (const r of rows) {
    if (!r.esito_finale) continue;
    tracked++;
    if (isRiuscito(fase, r.esito_finale, esitoTone)) riusciti++;
    if (r.esito_finale === "GOL") gol++;
  }
  return {
    tracked,
    riusciti,
    gol,
    riuscitiPct: pct(riusciti, tracked),
    golPct: pct(gol, tracked),
  };
}

function phase(
  fase: FaseEnum,
  all: EfficacyRow[],
  esitoTone: typeof ESITO_TONE,
): PhaseEfficacy {
  const rows = all.filter((r) => r.fase === fase);
  const perTipo = TIPO_ORDER.map((tipo) => ({
    tipo,
    ...stats(
      fase,
      rows.filter((r) => r.tipo_piazzato === tipo),
      esitoTone,
    ),
  })).filter((t) => t.tracked > 0);
  return { fase, total: rows.length, ...stats(fase, rows, esitoTone), perTipo };
}

export function computeSetPiecesEfficacy(
  rows: EfficacyRow[],
  esitoTone: typeof ESITO_TONE,
): SetPiecesEfficacy {
  return {
    OFFENSIVO: phase("OFFENSIVO", rows, esitoTone),
    DIFENSIVO: phase("DIFENSIVO", rows, esitoTone),
  };
}
