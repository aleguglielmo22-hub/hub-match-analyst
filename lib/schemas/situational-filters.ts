/**
 * Filtri della lista Situazionali. Stato in URL search params.
 * La sidebar implementa il nesting macro → sotto in modo dinamico:
 * vengono mostrate solo le sotto-fasi compatibili con le macro selezionate.
 */
import {
  MACRO_FASE_VALUES,
  SOTTO_FASE_VALUES,
  SOTTO_FASI_BY_MACRO,
  type MacroFaseEnum,
  type SottoFaseEnum,
} from "@/lib/types/situational";

export type SituationalFilters = {
  q?: string;
  macro_fase: MacroFaseEnum[];
  sotto_fase: SottoFaseEnum[];
  /** Filtra per tag di focus tattico (qualsiasi tag overlap). */
  focus_tags: string[];
};

export const EMPTY_SITUATIONAL_FILTERS: SituationalFilters = {
  macro_fase: [],
  sotto_fase: [],
  focus_tags: [],
};

function parseList<T extends string>(
  value: string | null | undefined,
  allowed?: readonly T[],
): T[] {
  if (!value) return [];
  const parts = value.split(",").map((v) => v.trim()).filter(Boolean) as T[];
  if (allowed) return parts.filter((v) => (allowed as readonly string[]).includes(v));
  return parts;
}

function getParam(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  if (params instanceof URLSearchParams) return params.get(key);
  const v = (params as Record<string, string | string[] | undefined>)[key];
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export function parseSituationalFiltersFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): SituationalFilters {
  const q = getParam(params, "q")?.trim() || undefined;
  const macro = parseList(getParam(params, "macro"), MACRO_FASE_VALUES);

  // Filtriamo le sotto-fasi per garantire coerenza coi macro selezionati.
  // Se l'utente lascia un sotto orfano in URL (es. ha cambiato i macro),
  // lo ignoriamo silenziosamente: non vogliamo crashare.
  const sottoRaw = parseList(getParam(params, "sotto"), SOTTO_FASE_VALUES);
  const allowedSotto = macro.length
    ? new Set(macro.flatMap((m) => SOTTO_FASI_BY_MACRO[m]))
    : null;
  const sotto = allowedSotto
    ? sottoRaw.filter((s) => allowedSotto.has(s))
    : sottoRaw;

  return {
    q,
    macro_fase: macro,
    sotto_fase: sotto,
    focus_tags: parseList(getParam(params, "tag")),
  };
}

export function situationalFiltersToSearchParams(
  filters: SituationalFilters,
  base?: URLSearchParams,
): URLSearchParams {
  const sp = new URLSearchParams(base);
  for (const k of ["q", "macro", "sotto", "tag"]) sp.delete(k);
  if (filters.q) sp.set("q", filters.q);
  if (filters.macro_fase.length) sp.set("macro", filters.macro_fase.join(","));
  if (filters.sotto_fase.length) sp.set("sotto", filters.sotto_fase.join(","));
  if (filters.focus_tags.length) sp.set("tag", filters.focus_tags.join(","));
  return sp;
}

export function countActiveSituationalFilters(f: SituationalFilters): number {
  let n = 0;
  if (f.q) n++;
  if (f.macro_fase.length) n++;
  if (f.sotto_fase.length) n++;
  if (f.focus_tags.length) n++;
  return n;
}
