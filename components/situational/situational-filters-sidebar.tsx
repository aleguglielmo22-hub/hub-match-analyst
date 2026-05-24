"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eraser, SlidersHorizontal } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  FOCUS_TAGS_PRESET,
  MACRO_FASE_BADGE,
  MACRO_FASE_LABEL,
  MACRO_FASE_VALUES,
  SOTTO_FASE_LABEL,
  SOTTO_FASI_BY_MACRO,
  type MacroFaseEnum,
  type SottoFaseEnum,
} from "@/lib/types/situational";
import {
  EMPTY_SITUATIONAL_FILTERS,
  countActiveSituationalFilters,
  situationalFiltersToSearchParams,
  type SituationalFilters,
} from "@/lib/schemas/situational-filters";

/**
 * Sidebar filtri Situazionali.
 *
 * Logica della nidificazione macro → sotto:
 *  - Se nessuna macro è selezionata, la sezione "Sotto-fase" è disabilitata
 *    e mostra un messaggio informativo. Niente lista chip "fantasma".
 *  - Selezionando una o più macro, vengono mostrate SOLO le sotto-fasi
 *    compatibili (calcolate da SOTTO_FASI_BY_MACRO).
 *  - Se l'utente deseleziona una macro, le sotto-fasi orfane vengono
 *    automaticamente rimosse dal filtro (vedi `pruneSottoByMacro`).
 */
export function SituationalFiltersSidebar({
  filters,
  availableFocusTags,
  className,
}: {
  filters: SituationalFilters;
  /** Tag focus distinti già usati nel workspace, per il chip group. */
  availableFocusTags: string[];
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [local, setLocal] = useState<SituationalFilters>(filters);
  const activeCount = countActiveSituationalFilters(local);

  // Sotto-fasi mostrate dipendono dai macro selezionati.
  const availableSotto = useMemo<SottoFaseEnum[]>(() => {
    if (local.macro_fase.length === 0) return [];
    const set = new Set<SottoFaseEnum>();
    for (const m of local.macro_fase) {
      for (const s of SOTTO_FASI_BY_MACRO[m]) set.add(s);
    }
    return Array.from(set);
  }, [local.macro_fase]);

  const pushUrl = useCallback(
    (next: SituationalFilters) => {
      const sp = situationalFiltersToSearchParams(
        next,
        searchParams ?? undefined,
      );
      router.replace(`/situational?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  /**
   * Quando cambiano le macro selezionate, eliminiamo le sotto-fasi
   * non più compatibili (orfani che non hanno più un macro che le contiene).
   */
  function pruneSottoByMacro(
    macros: MacroFaseEnum[],
    sotto: SottoFaseEnum[],
  ): SottoFaseEnum[] {
    if (macros.length === 0) return [];
    const allowed = new Set(macros.flatMap((m) => SOTTO_FASI_BY_MACRO[m]));
    return sotto.filter((s) => allowed.has(s));
  }

  function toggleMacro(m: MacroFaseEnum) {
    setLocal((curr) => {
      const nextMacros = curr.macro_fase.includes(m)
        ? curr.macro_fase.filter((x) => x !== m)
        : [...curr.macro_fase, m];
      const nextSotto = pruneSottoByMacro(nextMacros, curr.sotto_fase);
      const next: SituationalFilters = {
        ...curr,
        macro_fase: nextMacros,
        sotto_fase: nextSotto,
      };
      pushUrl(next);
      return next;
    });
  }

  function toggleSotto(s: SottoFaseEnum) {
    setLocal((curr) => {
      const nextSotto = curr.sotto_fase.includes(s)
        ? curr.sotto_fase.filter((x) => x !== s)
        : [...curr.sotto_fase, s];
      const next: SituationalFilters = { ...curr, sotto_fase: nextSotto };
      pushUrl(next);
      return next;
    });
  }

  function toggleFocusTag(tag: string) {
    setLocal((curr) => {
      const nextTags = curr.focus_tags.includes(tag)
        ? curr.focus_tags.filter((x) => x !== tag)
        : [...curr.focus_tags, tag];
      const next: SituationalFilters = { ...curr, focus_tags: nextTags };
      pushUrl(next);
      return next;
    });
  }

  const clearAll = useCallback(() => {
    const next = { ...EMPTY_SITUATIONAL_FILTERS, q: local.q };
    setLocal(next);
    const sp = situationalFiltersToSearchParams(next, searchParams ?? undefined);
    router.replace(`/situational?${sp.toString()}`, { scroll: false });
  }, [local.q, router, searchParams]);

  // Tag distinti dal workspace + preset, deduplicati per autocomplete chip.
  const allTags = useMemo(() => {
    const set = new Set<string>([
      ...availableFocusTags,
      ...FOCUS_TAGS_PRESET,
    ]);
    return Array.from(set).sort();
  }, [availableFocusTags]);

  return (
    <aside className={className}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Filtri</h2>
          {activeCount > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Eraser className="h-3 w-3" />
            Pulisci tutto
          </button>
        )}
      </div>

      {/* Macro-fase: sempre visibili (gate del nesting) */}
      <section className="mb-4 space-y-2 border-b border-sidebar-border/50 pb-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
          Livello 1 · Macro-fase
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {MACRO_FASE_VALUES.map((m) => {
            const active = local.macro_fase.includes(m);
            const c = MACRO_FASE_BADGE[m];
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMacro(m)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                  active
                    ? cn(c.bg, c.text, c.ring, "ring-1 border-transparent")
                    : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
                {MACRO_FASE_LABEL[m]}
              </button>
            );
          })}
        </div>
      </section>

      <Accordion
        defaultValue={["sotto"]}
        className="space-y-1 [&_[data-slot=accordion-item]]:not-last:border-b-0"
      >
        {/* Sotto-fase: dinamico in base ai macro selezionati */}
        <AccordionItem value="sotto">
          <AccordionTrigger className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70">
            <span className="flex items-center gap-2">
              Livello 2 · Sotto-fase
              {local.sotto_fase.length > 0 && (
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {local.sotto_fase.length}
                </span>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {availableSotto.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/50 bg-card/20 px-3 py-3 text-[11px] text-muted-foreground">
                Seleziona prima una macro-fase per vedere le sotto-fasi
                disponibili.
              </p>
            ) : (
              <div className="space-y-3">
                {/*
                 * Le sotto-fasi vengono raggruppate per macro per migliorare
                 * la leggibilità quando l'utente seleziona più macro.
                 */}
                {local.macro_fase.map((macro) => {
                  const sottoOfMacro = SOTTO_FASI_BY_MACRO[macro];
                  const c = MACRO_FASE_BADGE[macro];
                  return (
                    <div key={macro} className="space-y-1.5">
                      <p
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider",
                          c.text,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
                        {MACRO_FASE_LABEL[macro]}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {sottoOfMacro.map((s) => {
                          const active = local.sotto_fase.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => toggleSotto(s)}
                              aria-pressed={active}
                              title={SOTTO_FASE_LABEL[s]}
                              className={cn(
                                "rounded-md border px-2 py-1 text-[11px] transition-colors",
                                active
                                  ? "border-primary/60 bg-primary/15 text-primary"
                                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground",
                              )}
                            >
                              {SOTTO_FASE_LABEL[s]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Focus tags */}
        <AccordionItem value="focus">
          <AccordionTrigger className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70">
            <span className="flex items-center gap-2">
              Focus tattico
              {local.focus_tags.length > 0 && (
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {local.focus_tags.length}
                </span>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => {
                const active = local.focus_tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFocusTag(tag)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-md border px-2 py-1 text-[11px] transition-colors",
                      active
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground",
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  );
}
