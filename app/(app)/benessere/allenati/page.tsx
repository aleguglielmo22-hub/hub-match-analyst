import Link from "next/link";
import { ArrowLeft, ChevronRight, Dumbbell, Play } from "lucide-react";
import { SectionHeader } from "@/components/app/section-header";
import { LoadErrorBox } from "@/components/app/load-error";
import { StartEmptyButton, StartSessionButton } from "@/components/hub/action-buttons";
import { formatDate } from "@/lib/hub/fields";
import { detailHref, COLLECTIONS } from "@/lib/hub/registry";
import { hubClient, logSafeError, requireOwner } from "@/lib/hub/server";
import { estimatedMinutes } from "@/lib/hub/workout";

export const metadata = { title: "Allenati · Benessere" };
export const dynamic = "force-dynamic";

type Template = { id: string; nome: string; programma: string | null; giorni: string | null; note: string | null };
type Item = { template_id: string; serie: number | null; recupero_s: number | null };
type Session = { id: string; titolo: string; data: string; durata_min: number | null; created_at: string };

const NO_PROGRAM = "Altre schede";

/** Come la home di Lyfta: i programmi con le loro schede, pronte da far partire. */
export default async function AllenatiPage() {
  let templates: Template[] = [];
  let items: Item[] = [];
  let recent: Session[] = [];
  let running: Session | null = null;
  let failed = false;
  try {
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const [t, i, r] = await Promise.all([
      supabase
        .from("wk_templates")
        .select("id, nome, programma, giorni, note")
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null)
        .order("programma", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(500),
      supabase.from("wk_template_items").select("template_id, serie, recupero_s").eq("workspace_id", workspace.id).limit(5000),
      supabase
        .from("wk_sessions")
        .select("id, titolo, data, durata_min, created_at")
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    if (t.error) throw t.error;
    if (i.error) throw i.error;
    if (r.error) throw r.error;
    templates = (t.data ?? []) as Template[];
    items = (i.data ?? []) as Item[];
    recent = (r.data ?? []) as Session[];
    // Un allenamento senza durata iniziato nelle ultime 12 ore è "in corso".
    const since = Date.now() - 12 * 3600 * 1000;
    running = recent.find((s) => s.durata_min === null && new Date(s.created_at).getTime() > since) ?? null;
  } catch (err) {
    logSafeError("Allenati", err);
    failed = true;
  }

  const programs = new Map<string, Template[]>();
  for (const t of templates) {
    const key = t.programma?.trim() || NO_PROGRAM;
    programs.set(key, [...(programs.get(key) ?? []), t]);
  }
  const ordered = [...programs.entries()].sort(([a], [b]) => (a === NO_PROGRAM ? 1 : b === NO_PROGRAM ? -1 : a.localeCompare(b)));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <Link href="/benessere" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground max-md:min-h-11">
        <ArrowLeft className="h-3.5 w-3.5" /> Benessere
      </Link>
      <SectionHeader icon={Dumbbell} eyebrow="Benessere" title="Allenati" subtitle="Scegli una scheda e parti: serie, riposi e carichi li trovi già pronti." />

      {failed ? (
        <LoadErrorBox />
      ) : (
        <>
          {running && (
            <Link
              href={detailHref(COLLECTIONS.sessions, running.id)}
              className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4 hover:bg-primary/10 max-md:min-h-11"
            >
              <Play className="h-5 w-5 shrink-0 text-primary-text" />
              <span className="min-w-0 flex-1">
                <strong className="block text-sm">Allenamento in corso</strong>
                <span className="text-xs text-muted-foreground">{running.titolo} · tocca per riprendere</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <StartEmptyButton />
            <Link href="/benessere/schede/nuovo" className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted max-md:min-h-11">
              Nuova scheda
            </Link>
          </div>

          {ordered.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Non hai ancora schede: creane una o importale.</p>
          )}

          {ordered.map(([program, list]) => (
            <section key={program} className="space-y-2" aria-label={program}>
              <h2 className="text-sm font-semibold">
                {program} <span className="font-normal text-muted-foreground">· {list.length} {list.length === 1 ? "scheda" : "schede"}</span>
              </h2>
              <ul className="divide-y divide-border/60 rounded-xl border border-border">
                {list.map((t) => {
                  const mine = items.filter((i) => i.template_id === t.id);
                  const sets = mine.reduce((n, i) => n + (i.serie ?? 1), 0);
                  return (
                    <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <Link href={detailHref(COLLECTIONS.templatesWk, t.id)} className="min-w-0 flex-1 hover:underline">
                        <span className="block truncate text-sm font-medium">{t.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {mine.length} esercizi · {sets} serie · circa {estimatedMinutes(mine)} min
                        </span>
                      </Link>
                      <StartSessionButton templateId={t.id} compact />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {recent.length > 0 && (
            <section className="space-y-2" aria-label="Ultimi allenamenti">
              <h2 className="text-sm font-semibold">Ultimi allenamenti</h2>
              <ul className="divide-y divide-border/60 rounded-xl border border-border">
                {recent.map((s) => (
                  <li key={s.id}>
                    <Link href={detailHref(COLLECTIONS.sessions, s.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 max-md:min-h-11">
                      <span className="min-w-0 flex-1 truncate text-sm">{s.titolo}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(s.data)}
                        {s.durata_min ? ` · ${s.durata_min} min` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/benessere/allenamenti" className="text-xs text-muted-foreground hover:text-foreground">
                Tutto lo storico →
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}
