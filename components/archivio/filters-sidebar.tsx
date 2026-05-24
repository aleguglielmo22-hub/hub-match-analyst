"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eraser, SlidersHorizontal } from "lucide-react";
import {
  AMBITO_LABEL,
  CATEGORIA_LAVORO_LABEL,
  SORGENTE_VIDEO_LABEL,
  TIPO_MEDIA_LABEL,
  type AmbitoEnum,
  type CategoriaLavoroEnum,
  type SorgenteVideoEnum,
  type TipoMediaEnum,
} from "@/lib/types/archivio";
import {
  AMBITO_VALUES,
  CATEGORIA_LAVORO_VALUES,
  SORGENTE_VIDEO_VALUES,
  TIPO_MEDIA_VALUES,
} from "@/lib/schemas/archivio";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  filtersToSearchParams,
  type ArchiveFilters,
} from "@/lib/schemas/filters";
import {
  MultiSelectPopover,
  ToggleChipGroup,
} from "@/components/archivio/multi-select-popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LookupOption } from "@/app/(app)/archivio/actions";

type Props = {
  filters: ArchiveFilters;
  lookups: {
    teams: LookupOption[];
    competitions: LookupOption[];
    seasons: LookupOption[];
    tags: LookupOption[];
  };
  className?: string;
};

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 border-b border-sidebar-border/50 pb-4 last:border-b-0 last:pb-0">
      {title && (
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

export function FiltersSidebar({ filters, lookups, className }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [local, setLocal] = useState<ArchiveFilters>(filters);
  const activeCount = countActiveFilters(local);

  const pushUrl = useCallback(
    (next: ArchiveFilters) => {
      const sp = filtersToSearchParams(next, searchParams ?? undefined);
      router.replace(`/archivio?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const update = useCallback(
    (patch: Partial<ArchiveFilters>) => {
      setLocal((curr) => {
        const next = { ...curr, ...patch };
        pushUrl(next);
        return next;
      });
    },
    [pushUrl],
  );

  const clearAll = useCallback(() => {
    setLocal(EMPTY_FILTERS);
    pushUrl(EMPTY_FILTERS);
  }, [pushUrl]);

  const ambitoOpts = useMemo(
    () =>
      AMBITO_VALUES.map((v) => ({ value: v, label: AMBITO_LABEL[v] })),
    [],
  );
  const categoriaOpts = useMemo(
    () =>
      CATEGORIA_LAVORO_VALUES.map((v) => ({
        value: v,
        label: CATEGORIA_LAVORO_LABEL[v],
      })),
    [],
  );
  const tipoOpts = useMemo(
    () =>
      TIPO_MEDIA_VALUES.map((v) => ({
        value: v,
        label: TIPO_MEDIA_LABEL[v],
      })),
    [],
  );
  const sorgenteOpts = useMemo(
    () =>
      SORGENTE_VIDEO_VALUES.map((v) => ({
        value: v,
        label: SORGENTE_VIDEO_LABEL[v],
      })),
    [],
  );

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

      <div className="space-y-5">
        <Section title="Data">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label
                htmlFor="data-from"
                className="text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                Da
              </Label>
              <Input
                id="data-from"
                type="date"
                className="h-8 text-xs"
                value={local.dataFrom ?? ""}
                onChange={(e) =>
                  update({ dataFrom: e.target.value || undefined })
                }
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="data-to"
                className="text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                A
              </Label>
              <Input
                id="data-to"
                type="date"
                className="h-8 text-xs"
                value={local.dataTo ?? ""}
                onChange={(e) =>
                  update({ dataTo: e.target.value || undefined })
                }
              />
            </div>
          </div>
        </Section>

        <Section title="Stagione & Contesto">
          <MultiSelectPopover
            label="Stagione"
            options={lookups.seasons}
            value={local.season_ids}
            onChange={(v) => update({ season_ids: v })}
            placeholder="Tutte"
          />
          <MultiSelectPopover
            label="Squadra principale"
            options={lookups.teams}
            value={local.team_principale_ids}
            onChange={(v) => update({ team_principale_ids: v })}
            placeholder="Tutte"
          />
          <MultiSelectPopover
            label="Squadra avversaria"
            options={lookups.teams}
            value={local.team_avversario_ids}
            onChange={(v) => update({ team_avversario_ids: v })}
            placeholder="Tutte"
          />
          <MultiSelectPopover
            label="Competizione"
            options={lookups.competitions}
            value={local.competition_ids}
            onChange={(v) => update({ competition_ids: v })}
            placeholder="Tutte"
          />
        </Section>

        <Section title="Classificazione">
          <ToggleChipGroup<AmbitoEnum>
            label="Ambito"
            options={ambitoOpts}
            value={local.ambito}
            onChange={(v) => update({ ambito: v })}
          />
          <ToggleChipGroup<CategoriaLavoroEnum>
            label="Categoria lavoro"
            options={categoriaOpts}
            value={local.categoria_lavoro}
            onChange={(v) => update({ categoria_lavoro: v })}
          />
        </Section>

        <Section title="Media">
          <ToggleChipGroup<TipoMediaEnum>
            label="Tipo media"
            options={tipoOpts}
            value={local.tipo_media}
            onChange={(v) => update({ tipo_media: v })}
          />
          <ToggleChipGroup<SorgenteVideoEnum>
            label="Sorgente video"
            options={sorgenteOpts}
            value={local.sorgente_video}
            onChange={(v) => update({ sorgente_video: v })}
          />
        </Section>

        <Section title="Tag">
          <MultiSelectPopover
            label="Tag liberi"
            options={lookups.tags}
            value={local.tag_ids}
            onChange={(v) => update({ tag_ids: v })}
            placeholder="Tutti"
          />
        </Section>
      </div>
    </aside>
  );
}
