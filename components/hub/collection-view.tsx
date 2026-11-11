"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, LayoutGrid, List, Search, Table2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatValue, type FieldDef } from "@/lib/hub/fields";
import { COLLECTIONS, isCollectionKey, type ViewKind } from "@/lib/hub/registry";
import { statusBadgeClass } from "@/lib/hub/status";

export type ViewRow = Record<string, unknown> & { id: string };
type RefLabels = Record<string, Record<string, string>>;

const VIEWS: { key: ViewKind; label: string; icon: typeof Table2 }[] = [
  { key: "table", label: "Tabella", icon: Table2 },
  { key: "list", label: "Lista", icon: List },
  { key: "cards", label: "Schede", icon: LayoutGrid },
];

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function rowTitle(fields: FieldDef[], titleField: string, row: ViewRow, refLabels: RefLabels): string {
  const f = fields.find((x) => x.key === titleField);
  const v = f ? formatValue(f, row[titleField], refLabels[titleField]) : String(row[titleField] ?? "");
  return v || "Senza titolo";
}

export function rowSubtitle(fields: FieldDef[], keys: string[] | undefined, row: ViewRow, refLabels: RefLabels): string {
  return (keys ?? [])
    .map((k) => {
      const f = fields.find((x) => x.key === k);
      return f ? formatValue(f, row[k], refLabels[k]) : "";
    })
    .filter(Boolean)
    .join(" · ");
}

/**
 * Vista di una sezione, come un database di Notion: tabella, lista o schede,
 * ricerca veloce e filtri. Tutto avviene nel browser sui dati già caricati:
 * niente valori negli indirizzi delle pagine.
 */
export function CollectionView({
  collectionKey,
  rows,
  refLabels,
  emptyText,
}: {
  collectionKey: string;
  rows: ViewRow[];
  refLabels: RefLabels;
  emptyText?: string;
}) {
  const c = isCollectionKey(collectionKey) ? COLLECTIONS[collectionKey] : null;
  const storageKey = `ag.vista.${collectionKey}`;
  const [view, setView] = useState<ViewKind>(c?.defaultView ?? "table");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; asc: boolean } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "table" || saved === "list" || saved === "cards") setView(saved);
    } catch {
      // Preferenza non disponibile: resta la vista predefinita.
    }
  }, [storageKey]);

  function chooseView(v: ViewKind) {
    setView(v);
    try {
      localStorage.setItem(storageKey, v);
    } catch {
      // Ignora: la scelta vale finché la pagina resta aperta.
    }
  }

  const fields = useMemo(() => c?.fields ?? [], [c]);
  const filterFields = useMemo(
    () => (c?.filters ?? []).map((k) => fields.find((f) => f.key === k)).filter((f): f is FieldDef => !!f),
    [c, fields],
  );

  // Scelte di ogni filtro: dalle opzioni del campo o dai valori presenti.
  const filterOptions = useMemo(() => {
    const out: Record<string, { value: string; label: string }[]> = {};
    for (const f of filterFields) {
      if (f.type === "select" && f.options) out[f.key] = [...f.options];
      else if (f.type === "boolean") out[f.key] = [{ value: "true", label: "Sì" }, { value: "false", label: "No" }];
      else if (f.type === "rating") out[f.key] = [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: "★".repeat(n) }));
      else if (f.type === "ref") {
        const ids = new Set(rows.map((r) => r[f.key]).filter((v): v is string => typeof v === "string"));
        out[f.key] = [...ids].map((id) => ({ value: id, label: refLabels[f.key]?.[id] ?? "—" })).sort((a, b) => a.label.localeCompare(b.label));
      } else if (f.type === "tags") {
        const tags = new Set<string>();
        rows.forEach((r) => (Array.isArray(r[f.key]) ? (r[f.key] as string[]) : []).forEach((t) => tags.add(t)));
        out[f.key] = [...tags].sort((a, b) => a.localeCompare(b)).map((t) => ({ value: t, label: t }));
      } else {
        const vals = new Set(rows.map((r) => r[f.key]).filter((v): v is string => typeof v === "string" && v !== ""));
        out[f.key] = [...vals].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v }));
      }
    }
    return out;
  }, [filterFields, rows, refLabels]);

  const visible = useMemo(() => {
    if (!c) return [];
    const q = norm(query.trim());
    const textFields = fields.filter((f) => ["text", "longtext", "select", "ref", "tags"].includes(f.type));
    let out = rows.filter((r) => {
      for (const [k, v] of Object.entries(filters)) {
        if (!v) continue;
        const f = fields.find((x) => x.key === k);
        const cell = r[k];
        if (f?.type === "tags") {
          if (!Array.isArray(cell) || !(cell as string[]).includes(v)) return false;
        } else if (f?.type === "boolean") {
          if (String(cell === true) !== v) return false;
        } else if (String(cell ?? "") !== v) return false;
      }
      if (!q) return true;
      return textFields.some((f) => norm(formatValue(f, r[f.key], refLabels[f.key])).includes(q));
    });
    if (sort) {
      const f = fields.find((x) => x.key === sort.key);
      out = [...out].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (av === bv) return 0;
        if (av === null || av === undefined || av === "") return 1;
        if (bv === null || bv === undefined || bv === "") return -1;
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : f
              ? formatValue(f, av, refLabels[f.key]).localeCompare(formatValue(f, bv, refLabels[f.key]), "it", { numeric: true })
              : String(av).localeCompare(String(bv));
        return sort.asc ? cmp : -cmp;
      });
    }
    return out;
  }, [c, fields, rows, filters, query, sort, refLabels]);

  if (!c) return null;
  const tableFields = fields.filter((f) => f.inTable);
  const hrefFor = (id: string) => (c.slug ? `/${c.area}/${c.slug}/${id}` : null);
  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1">
          <span className="sr-only">Cerca in {c.label}</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca…"
            className="h-9 w-full rounded-lg border border-input bg-transparent pl-8 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 max-md:min-h-11"
          />
        </label>
        <div className="flex rounded-lg border border-border p-0.5" role="group" aria-label="Vista">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => chooseView(v.key)}
                aria-pressed={view === v.key}
                title={v.label}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium max-md:min-h-10",
                  view === v.key ? "bg-primary/10 text-primary-text" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="max-sm:sr-only">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filterFields.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filterFields.map((f) => (
            <label key={f.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{f.label}</span>
              <select
                value={filters[f.key] ?? ""}
                onChange={(e) => setFilters((p) => ({ ...p, [f.key]: e.target.value }))}
                className="h-8 max-w-44 rounded-lg border border-input bg-background px-2 text-xs text-foreground max-md:min-h-10"
              >
                <option value="">Tutti</option>
                {(filterOptions[f.key] ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={() => setFilters({})}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> Azzera filtri
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {visible.length === rows.length ? `${rows.length} elementi` : `${visible.length} di ${rows.length} elementi`}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? (emptyText ?? "Ancora niente qui.") : "Nessun elemento corrisponde alla ricerca."}
        </div>
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                {tableFields.map((f) => {
                  const active = sort?.key === f.key;
                  return (
                    <th key={f.key} scope="col" className="px-3 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => setSort((s) => (s?.key === f.key ? { key: f.key, asc: !s.asc } : { key: f.key, asc: true }))}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {f.label}
                        {active && (sort?.asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const href = hrefFor(r.id);
                return (
                  <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                    {tableFields.map((f, i) => {
                      const text = formatValue(f, r[f.key], refLabels[f.key]);
                      const content =
                        f.key === c.statusField || (f.type === "select" && f.key === "tipo" && c.area === "finanze") ? (
                          text ? <span className={cn("rounded-full px-2 py-0.5 text-xs", statusBadgeClass(r[f.key]))}>{text}</span> : null
                        ) : (
                          <span className={cn(f.type === "money" && "tabular-nums", f.type === "longtext" && "line-clamp-2")}>{text}</span>
                        );
                      return (
                        <td key={f.key} className={cn("px-3 py-2 align-top", f.type === "money" && "text-right")}>
                          {i === 0 && href ? (
                            <Link href={href} className="font-medium text-foreground hover:text-primary-text hover:underline">
                              {text || "Apri"}
                            </Link>
                          ) : (
                            content
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : view === "list" ? (
        <ul className="divide-y divide-border/60 rounded-xl border border-border">
          {visible.map((r) => (
            <RowItem key={r.id} c={c} row={r} refLabels={refLabels} href={hrefFor(r.id)} layout="list" />
          ))}
        </ul>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => (
            <RowItem key={r.id} c={c} row={r} refLabels={refLabels} href={hrefFor(r.id)} layout="card" />
          ))}
        </ul>
      )}
    </div>
  );
}

function RowItem({
  c,
  row,
  refLabels,
  href,
  layout,
}: {
  c: (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
  row: ViewRow;
  refLabels: RefLabels;
  href: string | null;
  layout: "list" | "card";
}) {
  const title = rowTitle(c.fields, c.titleField, row, refLabels);
  const subtitle = rowSubtitle(c.fields, c.subtitleFields, row, refLabels);
  const statusField = c.fields.find((f) => f.key === c.statusField);
  const status = statusField ? formatValue(statusField, row[statusField.key]) : "";
  const rating = row.voto ?? row.sensazione;
  const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("font-medium text-foreground", layout === "card" ? "line-clamp-2" : "truncate")}>{title}</p>
        {status && (
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px]", statusBadgeClass(row[statusField!.key]))}>{status}</span>
        )}
      </div>
      {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
      {(typeof rating === "number" || tags.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {typeof rating === "number" && <span className="text-primary-text" aria-label={`${rating} su 5`}>{"★".repeat(rating)}</span>}
          {tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      )}
    </>
  );
  const cls =
    layout === "card"
      ? "block h-full rounded-xl border border-border bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
      : "block px-4 py-3 transition-colors hover:bg-muted/30";
  return (
    <li>
      {href ? (
        <Link href={href} className={cls}>
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
