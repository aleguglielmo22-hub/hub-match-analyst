import Link from "next/link";
import { Info, Trash2 } from "lucide-react";
import { SectionHeader } from "@/components/app/section-header";
import { SearchInput } from "@/components/archivio/search-input";
import { TrashView } from "@/components/cestino/trash-view";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";
import {
  parseTrashSection,
  TRASH_SECTION,
  TRASH_SECTIONS,
  type TrashSection,
} from "@/lib/trash/sections";
import { loadTrash } from "./actions";

export const metadata = {
  title: "Cestino",
};

export const dynamic = "force-dynamic";

function sectionHref(section: TrashSection | null, query?: string): string {
  const sp = new URLSearchParams();
  if (section) sp.set("sezione", section);
  if (query) sp.set("q", query);
  const s = sp.toString();
  return s ? `/cestino?${s}` : "/cestino";
}

export default async function CestinoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const section = parseTrashSection(first(sp.sezione));
  const query = first(sp.q)?.trim() || undefined;

  const [workspace, result] = await Promise.all([
    getCurrentWorkspace(),
    loadTrash({ section, query }),
  ]);

  // Filtri raggruppati per area: Lavoro, Studi, Benessere, Finanze.
  const groups = ["Lavoro", "Studi", "Benessere", "Finanze"] as const;
  const chipGroups: { label: string | null; chips: { key: TrashSection | null; label: string }[] }[] = [
    { label: null, chips: [{ key: null, label: "Tutto" }] },
    ...groups.map((g) => ({
      label: g,
      chips: TRASH_SECTIONS.filter((s) => TRASH_SECTION[s].group === g).map((s) => ({ key: s, label: TRASH_SECTION[s].label })),
    })),
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <SectionHeader
        icon={Trash2}
        title="Cestino"
        subtitle="Tutto ciò che hai spostato nel cestino, da tutte le aree"
      />

      <div className="flex items-start gap-3 rounded-xl border border-tone-warning/40 bg-tone-warning-soft px-4 py-3 text-tone-warning-fg">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-xs leading-relaxed">
          Gli elementi nel cestino non compaiono in liste, ricerche e Dashboard
          e restano qui finché non li ripristini. L&apos;eliminazione
          definitiva rimuove anche i file
          allegati e non si può annullare.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <nav aria-label="Filtra per sezione" className="flex flex-col gap-2">
          {chipGroups.map((g) => (
            <div key={g.label ?? "tutto"} className="flex flex-wrap items-center gap-2">
              {g.label && <span className="w-20 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</span>}
              {g.chips.map((c) => {
                const active = c.key === section;
                return (
                  <Link
                    key={c.key ?? "all"}
                    href={sectionHref(c.key, query)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition-colors max-md:min-h-11",
                      active
                        ? "border-primary/60 bg-primary/10 text-primary-text"
                        : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {c.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sm:w-72">
          <SearchInput
            basePath="/cestino"
            initialQuery={query}
            placeholder="Cerca per nome o titolo…"
          />
        </div>
      </div>

      <TrashView
        key={`${section ?? "all"}|${query ?? ""}`}
        initial={result}
        isOwner={!!workspace?.isOwner}
        filtered={!!query}
      />
    </div>
  );
}
