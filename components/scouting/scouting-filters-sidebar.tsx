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
import { ToggleChipGroup } from "@/components/archivio/multi-select-popover";
import { RatingSlider } from "@/components/scouting/rating-slider";
import {
  FASCIA_ETA_LABEL,
  FASCIA_INGAGGIO_LABEL,
  FASCIA_INGAGGIO_VALUES,
  GESTI_MOTORI_LABEL,
  GESTI_MOTORI_VALUES,
  MUSCOLATURA_LABEL,
  MUSCOLATURA_VALUES,
  PASSAPORTO_LABEL,
  PASSAPORTO_VALUES,
  PIEDE_LABEL,
  PIEDE_VALUES,
  RATING_AREA_LABEL,
  RATING_AREA_MACRO,
  RATING_MACRO_LABEL,
  RATINGS,
  RUOLO_GRUPPI,
  RUOLO_LABEL,
  SCADENZA_QUICK_LABEL,
  STATUS_OSSERVAZIONE_LABEL,
  STATUS_OSSERVAZIONE_VALUES,
  STRUTTURA_CORPOREA_LABEL,
  STRUTTURA_CORPOREA_VALUES,
  VOTO_POTENZIALE_SHORT,
  VOTO_POTENZIALE_VALUES,
  type FasciaEta,
  type FasciaIngaggioEnum,
  type GestiMotoriEnum,
  type MuscolaturaEnum,
  type PassaportoEnum,
  type PiedeEnum,
  type RatingArea,
  type RatingKey,
  type RatingMacroGroup,
  type ScadenzaQuick,
  type StatusOsservazioneEnum,
  type StrutturaCorporeaEnum,
  type VotoPotenzialeEnum,
} from "@/lib/types/scouting";
import {
  EMPTY_SCOUTING_FILTERS,
  countActiveScoutingFilters,
  scoutingFiltersToSearchParams,
  type ScoutingFilters,
} from "@/lib/schemas/scouting-filters";

const FASCE_ETA: FasciaEta[] = ["U21", "TRA_22_26", "OVER_27"];
const SCADENZE: ScadenzaQuick[] = ["ENTRO_6_MESI", "ENTRO_12_MESI"];

const RATING_MACRO_ORDER: RatingMacroGroup[] = [
  "COMPORTAMENTALI",
  "ATLETICHE",
  "TECNICA_COORD",
  "TATTICA_IND",
  "TATTICA_APPL",
];

const RATING_MACRO_COLOR: Record<
  RatingMacroGroup,
  "emerald" | "rose" | "sky"
> = {
  COMPORTAMENTALI: "sky",
  ATLETICHE: "emerald",
  TECNICA_COORD: "emerald",
  TATTICA_IND: "rose",
  TATTICA_APPL: "rose",
};

function ScadenzaQuickPicker({
  value,
  onChange,
}: {
  value: ScadenzaQuick | undefined;
  onChange: (v: ScadenzaQuick | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-sidebar-foreground/80">
        Scadenza contratto
      </span>
      <div className="flex flex-wrap gap-1">
        {SCADENZE.map((v) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(active ? undefined : v)}
              aria-pressed={active}
              className={
                "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors " +
                (active
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border bg-transparent text-muted-foreground hover:border-border/80 hover:text-foreground")
              }
            >
              {SCADENZA_QUICK_LABEL[v]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ScoutingFiltersSidebar({
  filters,
  className,
}: {
  filters: ScoutingFilters;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [local, setLocal] = useState<ScoutingFilters>(filters);
  const activeCount = countActiveScoutingFilters(local);

  const pushUrl = useCallback(
    (next: ScoutingFilters) => {
      const sp = scoutingFiltersToSearchParams(next, searchParams ?? undefined);
      router.replace(`/scouting?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const update = useCallback(
    (patch: Partial<ScoutingFilters>) => {
      setLocal((curr) => {
        const next = { ...curr, ...patch } as ScoutingFilters;
        pushUrl(next);
        return next;
      });
    },
    [pushUrl],
  );

  const updateRating = useCallback(
    (key: RatingKey, value: number) => {
      setLocal((curr) => {
        const next: ScoutingFilters = {
          ...curr,
          ratings_min: { ...curr.ratings_min },
        };
        if (value <= 0) delete next.ratings_min[key];
        else next.ratings_min[key] = value;
        pushUrl(next);
        return next;
      });
    },
    [pushUrl],
  );

  const clearAll = useCallback(() => {
    setLocal({ ...EMPTY_SCOUTING_FILTERS });
    const sp = scoutingFiltersToSearchParams(
      { ...EMPTY_SCOUTING_FILTERS, q: local.q },
      searchParams ?? undefined,
    );
    router.replace(`/scouting?${sp.toString()}`, { scroll: false });
  }, [local.q, router, searchParams]);

  // Opzioni precomputate (chip labels)
  const fasceEtaOpts = useMemo(
    () => FASCE_ETA.map((v) => ({ value: v, label: FASCIA_ETA_LABEL[v] })),
    [],
  );
  const passaportoOpts = useMemo(
    () =>
      PASSAPORTO_VALUES.map((v) => ({ value: v, label: PASSAPORTO_LABEL[v] })),
    [],
  );
  const piedeOpts = useMemo(
    () => PIEDE_VALUES.map((v) => ({ value: v, label: PIEDE_LABEL[v] })),
    [],
  );
  const strutturaOpts = useMemo(
    () =>
      STRUTTURA_CORPOREA_VALUES.map((v) => ({
        value: v,
        label: STRUTTURA_CORPOREA_LABEL[v],
      })),
    [],
  );
  const gestiOpts = useMemo(
    () =>
      GESTI_MOTORI_VALUES.map((v) => ({
        value: v,
        label: GESTI_MOTORI_LABEL[v],
      })),
    [],
  );
  const muscolaturaOpts = useMemo(
    () =>
      MUSCOLATURA_VALUES.map((v) => ({
        value: v,
        label: MUSCOLATURA_LABEL[v],
      })),
    [],
  );
  const fasciaIngaggioOpts = useMemo(
    () =>
      FASCIA_INGAGGIO_VALUES.map((v) => ({
        value: v,
        label: FASCIA_INGAGGIO_LABEL[v],
      })),
    [],
  );
  const statusOpts = useMemo(
    () =>
      STATUS_OSSERVAZIONE_VALUES.map((v) => ({
        value: v,
        label: STATUS_OSSERVAZIONE_LABEL[v],
      })),
    [],
  );
  const votoOpts = useMemo(
    () =>
      VOTO_POTENZIALE_VALUES.map((v) => ({
        value: v,
        label: VOTO_POTENZIALE_SHORT[v],
      })),
    [],
  );

  // Rating raggruppati per macro-area, poi per RatingArea interna.
  const ratingsByMacro = useMemo(() => {
    const groups: Record<
      RatingMacroGroup,
      { area: RatingArea; items: typeof RATINGS }[]
    > = {
      COMPORTAMENTALI: [],
      ATLETICHE: [],
      TECNICA_COORD: [],
      TATTICA_IND: [],
      TATTICA_APPL: [],
    };
    const seenArea = new Map<string, (typeof RATINGS)[number][]>();
    for (const r of RATINGS) {
      const arr = seenArea.get(r.area) ?? [];
      arr.push(r);
      seenArea.set(r.area, arr);
    }
    for (const [area, items] of seenArea.entries()) {
      const macro = RATING_AREA_MACRO[area as RatingArea];
      groups[macro].push({ area: area as RatingArea, items });
    }
    return groups;
  }, []);

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

      {/* Anagrafica fissa in alto */}
      <section className="mb-4 space-y-4 border-b border-sidebar-border/50 pb-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
          Anagrafica
        </h3>
        <ToggleChipGroup<FasciaEta>
          label="Fascia d'età"
          options={fasceEtaOpts}
          value={local.fascia_eta}
          onChange={(v) => update({ fascia_eta: v })}
        />
        <ToggleChipGroup<PassaportoEnum>
          label="Passaporto"
          options={passaportoOpts}
          value={local.passaporto}
          onChange={(v) => update({ passaporto: v })}
        />
        <ToggleChipGroup<PiedeEnum>
          label="Piede preferito"
          options={piedeOpts}
          value={local.piede}
          onChange={(v) => update({ piede: v })}
        />
      </section>

      <Accordion
        defaultValue={["ruolo"]}
        className="space-y-1 [&_[data-slot=accordion-item]]:not-last:border-b-0"
      >
        {/* Ruolo */}
        <AccordionItem value="ruolo">
          <AccordionTrigger className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70">
            Ruolo
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {RUOLO_GRUPPI.map((gruppo) => (
                <div key={gruppo.label} className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {gruppo.label}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {gruppo.values.map((v) => {
                      const active = local.ruolo_principale.includes(v);
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            const next = active
                              ? local.ruolo_principale.filter((x) => x !== v)
                              : [...local.ruolo_principale, v];
                            update({ ruolo_principale: next });
                          }}
                          aria-pressed={active}
                          title={RUOLO_LABEL[v]}
                          className={
                            "rounded-md border px-2 py-1 text-[11px] font-mono font-semibold transition-colors " +
                            (active
                              ? "border-primary/60 bg-primary/15 text-primary"
                              : "border-border bg-transparent text-muted-foreground hover:border-border/80 hover:text-foreground")
                          }
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {local.ruolo_principale.length > 0 && (
                <button
                  type="button"
                  onClick={() => update({ ruolo_principale: [] })}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Pulisci ruoli
                </button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Fisico */}
        <AccordionItem value="fisico">
          <AccordionTrigger className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70">
            Fisico
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <ToggleChipGroup<StrutturaCorporeaEnum>
                label="Struttura corporea"
                options={strutturaOpts}
                value={local.struttura_corporea}
                onChange={(v) => update({ struttura_corporea: v })}
              />
              <ToggleChipGroup<GestiMotoriEnum>
                label="Gesti motori"
                options={gestiOpts}
                value={local.gesti_motori}
                onChange={(v) => update({ gesti_motori: v })}
              />
              <ToggleChipGroup<MuscolaturaEnum>
                label="Muscolatura"
                options={muscolaturaOpts}
                value={local.muscolatura}
                onChange={(v) => update({ muscolatura: v })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Workflow */}
        <AccordionItem value="workflow">
          <AccordionTrigger className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70">
            Workflow
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <ToggleChipGroup<StatusOsservazioneEnum>
                label="Status osservazione"
                options={statusOpts}
                value={local.status_osservazione}
                onChange={(v) => update({ status_osservazione: v })}
              />
              <ToggleChipGroup<VotoPotenzialeEnum>
                label="Voto potenziale"
                options={votoOpts}
                value={local.voto_potenziale}
                onChange={(v) => update({ voto_potenziale: v })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Contratto */}
        <AccordionItem value="contratto">
          <AccordionTrigger className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70">
            Contratto
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <ScadenzaQuickPicker
                value={local.scadenza_quick}
                onChange={(v) => update({ scadenza_quick: v })}
              />
              <ToggleChipGroup<FasciaIngaggioEnum>
                label="Fascia ingaggio"
                options={fasciaIngaggioOpts}
                value={local.fascia_ingaggio}
                onChange={(v) => update({ fascia_ingaggio: v })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Valutazioni — 5 macro-aree, ciascuna come AccordionItem */}
        {RATING_MACRO_ORDER.map((macro) => {
          const areas = ratingsByMacro[macro];
          if (!areas.length) return null;
          // Conta quanti rating di questa macro hanno una soglia attiva
          let activeInGroup = 0;
          for (const a of areas) {
            for (const r of a.items) {
              if (typeof local.ratings_min[r.key] === "number")
                activeInGroup++;
            }
          }
          return (
            <AccordionItem key={macro} value={`val-${macro.toLowerCase()}`}>
              <AccordionTrigger className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70">
                <span className="flex items-center gap-2">
                  Valutazioni · {RATING_MACRO_LABEL[macro]}
                  {activeInGroup > 0 && (
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {activeInGroup}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {areas.map(({ area, items }) => (
                    <div key={area} className="space-y-3">
                      {/* Se la macro raggruppa più aree (Tecnica+Coord, Tattica Ind, Tattica Appl)
                          mostra il sub-label dell'area. */}
                      {areas.length > 1 && (
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          {RATING_AREA_LABEL[area]}
                        </p>
                      )}
                      {items.map((r) => (
                        <RatingSlider
                          key={r.key}
                          label={r.label}
                          value={local.ratings_min[r.key] ?? 0}
                          groupColor={RATING_MACRO_COLOR[macro]}
                          onChange={(v) => updateRating(r.key, v)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </aside>
  );
}
