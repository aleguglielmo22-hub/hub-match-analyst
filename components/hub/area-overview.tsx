import { Suspense } from "react";
import Link from "next/link";
import { SectionHeader } from "@/components/app/section-header";
import { AREAS, type NavArea } from "@/components/app/nav-items";
import { ROUTED_COLLECTIONS, listHref, newLabel } from "@/lib/hub/registry";
import { logSafeError } from "@/lib/hub/server";
import { countWhere } from "@/lib/hub/summary";

async function Count({ table, trash }: { table: string; trash: boolean }) {
  let n: number | null = null;
  try {
    n = await countWhere(table, {}, trash);
  } catch (err) {
    logSafeError(`Conteggio ${table}`, err);
  }
  if (n === null) return null;
  return <span className="text-xs text-muted-foreground">{n === 1 ? "1 elemento" : `${n} elementi`}</span>;
}

/** Pagina di un'area: le sotto-sezioni come riquadri, con il numero di elementi. */
export function AreaOverview({ areaKey, children }: { areaKey: NavArea["key"]; children?: React.ReactNode }) {
  const area = AREAS.find((a) => a.key === areaKey)!;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <SectionHeader icon={area.icon} eyebrow="Area" title={area.label} subtitle={area.description} />
      <nav aria-label={`Sezioni di ${area.label}`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {area.children.map((s) => {
          const Icon = s.icon;
          const c = ROUTED_COLLECTIONS.find((x) => listHref(x) === s.href);
          return (
            <div key={s.href} className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card/40 p-4 transition-colors hover:border-primary/40">
              <Link href={s.href} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-text">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{c?.description ?? ""}</span>
                </span>
              </Link>
              {c && (
                <div className="flex items-center justify-between gap-2">
                  <Suspense fallback={<span className="text-xs text-muted-foreground">…</span>}>
                    <Count table={c.table} trash={c.trash} />
                  </Suspense>
                  <Link href={`${listHref(c)}/nuovo`} className="text-xs font-medium text-primary-text hover:underline max-md:py-2">
                    + {newLabel(c)}
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
