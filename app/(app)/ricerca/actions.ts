"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { logLoadError } from "@/lib/load-result";
import { ilikeAnyFilter } from "@/lib/search/ilike-filter";
import type { SearchRow } from "@/lib/search/global-results";
import { formatValue } from "@/lib/hub/fields";
import { ROUTED_COLLECTIONS, detailHref, type CollectionDef } from "@/lib/hub/registry";
import { hubClient, logSafeError } from "@/lib/hub/server";

const HUB_LIMIT = 5;
const AREA_LABEL = { studi: "Studi", benessere: "Benessere", finanze: "Finanze" } as const;

/** Sezioni personali in cui si cerca: quelle con un titolo di testo. */
const SEARCHABLE = ROUTED_COLLECTIONS.filter((c) => {
  const t = c.fields.find((f) => f.key === c.titleField);
  return t && (t.type === "text" || t.type === "longtext");
});

/** Cerca nelle sezioni personali (titolo + campi indicati nel registro). */
async function searchHub(workspaceId: string, q: string): Promise<SearchRow[]> {
  const supabase = await hubClient();
  const results = await Promise.all(
    SEARCHABLE.map(async (c: CollectionDef) => {
      const cols = [c.titleField, ...(c.searchFields ?? [])].filter((k) => {
        const f = c.fields.find((x) => x.key === k);
        return f && (f.type === "text" || f.type === "longtext");
      });
      let query = supabase.from(c.table).select("*").eq("workspace_id", workspaceId).or(ilikeAnyFilter(cols, q));
      if (c.trash) query = query.is("deleted_at", null);
      const { data, error } = await query.order("updated_at", { ascending: false }).limit(HUB_LIMIT);
      if (error) {
        logSafeError(`Ricerca · ${c.label}`, error);
        return [];
      }
      const titleF = c.fields.find((f) => f.key === c.titleField)!;
      return ((data ?? []) as Record<string, unknown>[]).map((row): SearchRow => {
        const subtitle = (c.subtitleFields ?? [])
          .map((k) => {
            const f = c.fields.find((x) => x.key === k);
            return f && f.type !== "ref" ? formatValue(f, row[k]) : "";
          })
          .filter(Boolean)
          .join(" · ");
        const title = formatValue(titleF, row[c.titleField]);
        return {
          sezione: "hub",
          tipo: c.key,
          id: String(row.id),
          titolo: title.length > 120 ? `${title.slice(0, 120)}…` : title,
          sottotitolo: subtitle || null,
          data: null,
          punteggio: 0,
          collegato_a: null,
          apri_id: null,
          href: detailHref(c, String(row.id)),
          gruppo: `${AREA_LABEL[c.area]} · ${c.label}`,
        };
      });
    }),
  );
  return results.flat();
}

/**
 * Ricerca globale nel workspace corrente: Lavoro (search_all, migrazione
 * 0015) e sezioni personali. Gira con i permessi dell'utente (RLS).
 */
export async function globalSearch(
  query: string,
): Promise<{ ok: true; rows: SearchRow[] } | { ok: false }> {
  const q = z.string().max(100).parse(query).trim();
  if (q.length < 2) return { ok: true, rows: [] };
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) return { ok: true, rows: [] };
    const supabase = await createClient();
    const [{ data, error }, hub] = await Promise.all([
      supabase.rpc("search_all", { p_workspace: workspace.id, p_query: q }),
      workspace.isOwner ? searchHub(workspace.id, q).catch(() => [] as SearchRow[]) : Promise.resolve([] as SearchRow[]),
    ]);
    if (error) throw error;
    return { ok: true, rows: [...((data ?? []) as SearchRow[]), ...hub] };
  } catch (err) {
    logLoadError("Ricerca globale", err);
    return { ok: false };
  }
}
