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
import { ToggleChipGroup, MultiSelectPopover } from "@/components/archivio/multi-select-popover";
import {
  esitoLabel,
  ESITO_FINALE_VALUES,
  FASE_LABEL,
  FASE_VALUES,
  LATO_BATTUTA_LABEL,
  LATO_BATTUTA_VALUES,
  SPECIFICAZIONE_PUNIZIONE_LABEL,
  SPECIFICAZIONE_PUNIZIONE_VALUES,
  TIPO_PIAZZATO_LABEL,
  TIPO_PIAZZATO_VALUES,
  type EsitoFinaleEnum,
  type FaseEnum,
  type LatoBattutaEnum,
  type SpecificazionePunizioneEnum,
  type TipoPiazzatoEnum,
} from "@/lib/types/set-pieces";
import {
  EMPTY_SET_PIECES_FILTERS,
  countActiveSetPiecesFilters,
  setPiecesFiltersToSearchParams,
  type SetPiecesFilters,
} from "@/lib/schemas/set-pieces-filters";
import type { SharedLookups } from "@/app/(app)/lookups/actions";

export function SetPiecesFiltersSidebar({
  filters,
  lookups,
  className,
}: {
  filters: SetPiecesFilters;
  /** Squadre, competizioni e stagioni per i filtri di contesto. */
  lookups: SharedLookups;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [local, setLocal] = useState<SetPiecesFilters>(filters);
  const activeCount = countActiveSetPiecesFilters(local);

  const pushUrl = useCallback(
    (next: SetPiecesFilters) => {
      const sp = setPiecesFiltersToSearchParams(
        next,
        searchParams ?? undefined,
      );
      router.replace(`/set-pieces?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const update = useCallback(
    (patch: Partial<SetPiecesFilters>) => {
      setLocal((curr) => {
        const next = { ...curr, ...patch } as SetPiecesFilters;
        pushUrl(next);
        return next;
      });
    },
    [pushUrl],
  );

  const clearAll = useCallback(() => {
    const next = { ...EMPTY_SET_PIECES_FILTERS, q: local.q };
    setLocal(next);
    const sp = setPiecesFiltersToSearchParams(next, searchParams ?? undefined);
    router.replace(`/set-pieces?${sp.toString()}`, { scroll: false });
  }, [local.q, router, searchParams]);

  const faseOpts = useMemo(
    () => FASE_VALUES.map((v) => ({ value: v, label: FASE_LABEL[v] })),
    [],
  );
  const tipoOpts = useMemo(
    () =>
      TIPO_PIAZZATO_VALUES.map((v) => ({
        value: v,
        label: TIPO_PIAZZATO_LABEL[v],
      })),
    [],
  );
  const specOpts = useMemo(
    () =>
      SPECIFICAZIONE_PUNIZIONE_VALUES.map((v) => ({
        value: v,
        label: SPECIFICAZIONE_PUNIZIONE_LABEL[v],
      })),
    [],
  );
  const latoOpts = useMemo(
    () =>
      LATO_BATTUTA_VALUES.map((v) => ({
        value: v,
        label: LATO_BATTUTA_LABEL[v],
      })),
    [],
  );
  // Etichetta dell'esito secondo la fase filtrata (una sola fase → nome di quella fase).
  const faseFiltrata = local.fase.length === 1 ? local.fase[0] : null;
  const esitoOpts = useMemo(
    () =>
      ESITO_FINALE_VALUES.map((v) => ({
        value: v,
        label: esitoLabel(v, faseFiltrata),
      })),
    [faseFiltrata],
  );

  return (
    <aside className={className}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Filtri</h2>
          {activeCount > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground max-md:min-h-11 max-md:px-2"
          >
            <Eraser className="h-3 w-3" />
            Pulisci tutto
          </button>
        )}
      </div>

      {/* Macro fissi in alto */}
      <section className="mb-4 space-y-4 border-b border-sidebar-border/50 pb-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
          Macro
        </h3>
        <ToggleChipGroup<FaseEnum>
          label="Fase"
          options={faseOpts}
          value={local.fase}
          onChange={(v) => update({ fase: v })}
        />
        <ToggleChipGroup<TipoPiazzatoEnum>
          label="Tipo di piazzato"
          options={tipoOpts}
          value={local.tipo_piazzato}
          onChange={(v) => update({ tipo_piazzato: v })}
        />
      </section>

      {/* Contesto: anagrafiche condivise */}
      <section className="mb-4 space-y-3 border-b border-sidebar-border/50 pb-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
          Contesto
        </h3>
        <MultiSelectPopover
          label="Squadra (esecutrice o avversaria)"
          options={lookups.teams}
          value={local.team_ids}
          onChange={(v) => update({ team_ids: v })}
          placeholder="Tutte"
        />
        <MultiSelectPopover
          label="Competizione"
          options={lookups.competitions}
          value={local.competition_ids}
          onChange={(v) => update({ competition_ids: v })}
          placeholder="Tutte"
        />
        <MultiSelectPopover
          label="Stagione"
          options={lookups.seasons}
          value={local.season_ids}
          onChange={(v) => update({ season_ids: v })}
          placeholder="Tutte"
        />
      </section>

      <Accordion
        defaultValue={["esito"]}
        className="space-y-1 [&_[data-slot=accordion-item]]:not-last:border-b-0"
      >
        <AccordionItem value="punizione">
          <AccordionTrigger className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70">
            Punizione (dettagli)
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <ToggleChipGroup<SpecificazionePunizioneEnum>
                label="Specificazione"
                options={specOpts}
                value={local.specificazione_punizione}
                onChange={(v) => update({ specificazione_punizione: v })}
              />
              <p className="text-[10px] text-muted-foreground/70">
                Si applica solo agli schemi con tipo Punizione.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="lato">
          <AccordionTrigger className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70">
            Lato di battuta
          </AccordionTrigger>
          <AccordionContent>
            <ToggleChipGroup<LatoBattutaEnum>
              label="Lato"
              options={latoOpts}
              value={local.lato_battuta}
              onChange={(v) => update({ lato_battuta: v })}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="esito">
          <AccordionTrigger className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70">
            Esito finale
          </AccordionTrigger>
          <AccordionContent>
            <ToggleChipGroup<EsitoFinaleEnum>
              label="Esito"
              options={esitoOpts}
              value={local.esito_finale}
              onChange={(v) => update({ esito_finale: v })}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  );
}
