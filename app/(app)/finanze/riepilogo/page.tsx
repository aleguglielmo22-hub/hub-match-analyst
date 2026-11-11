import Link from "next/link";
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeader } from "@/components/app/section-header";
import { LoadErrorBox } from "@/components/app/load-error";
import { HBars, MonthColumns, ProgressBar } from "@/components/hub/charts";
import { formatMoney } from "@/lib/hub/fields";
import { COLLECTIONS, detailHref } from "@/lib/hub/registry";
import { listRows, logSafeError, type Row } from "@/lib/hub/server";
import { monthBounds, sumByType, transactionsBetween, type TxLite } from "@/lib/hub/summary";

export const metadata = { title: "Riepilogo · Finanze" };
export const dynamic = "force-dynamic";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const MONTHS_LONG = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

export default async function RiepilogoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const now = new Date();
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const y = Number(first(sp.anno));
  const m = Number(first(sp.mese));
  const year = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : now.getFullYear();
  const month = Number.isInteger(m) && m >= 1 && m <= 12 ? m : now.getMonth() + 1;

  let yearTx: TxLite[] = [];
  let categories: Row[] = [];
  let goals: Row[] = [];
  let failed = false;
  try {
    [yearTx, categories, goals] = await Promise.all([
      transactionsBetween(`${year}-01-01`, `${year}-12-31`),
      listRows(COLLECTIONS.categories),
      listRows(COLLECTIONS.goals),
    ]);
  } catch (err) {
    logSafeError("Riepilogo finanze", err);
    failed = true;
  }

  const { from, to } = monthBounds(year, month);
  const monthTx = yearTx.filter((t) => t.data >= from && t.data <= to);
  const monthSum = sumByType(monthTx);
  const yearSum = sumByType(yearTx);
  const months = MONTHS.map((label, i) => {
    const b = monthBounds(year, i + 1);
    return { label, ...sumByType(yearTx.filter((t) => t.data >= b.from && t.data <= b.to)) };
  });

  const catName = new Map(categories.map((c) => [c.id, String(c.nome)]));
  const catBudget = new Map(categories.map((c) => [c.id, c.budget_mensile_cent == null ? null : Number(c.budget_mensile_cent)]));
  const byCat = new Map<string, number>();
  for (const t of monthTx) {
    if (t.tipo !== "uscita") continue;
    const k = t.categoria_id ?? "";
    byCat.set(k, (byCat.get(k) ?? 0) + t.importo_cent);
  }
  const bars = [...byCat.entries()]
    .map(([k, v]) => ({ label: k ? (catName.get(k) ?? "Categoria eliminata") : "Senza categoria", value: v, tone: "danger" as const }))
    .sort((a, b) => b.value - a.value);
  const budgets = [...catBudget.entries()]
    .filter(([, b]) => b !== null && b > 0)
    .map(([id, b]) => ({ id, name: catName.get(id) ?? "", budget: b as number, spent: byCat.get(id) ?? 0 }));

  const prev = month === 1 ? { anno: year - 1, mese: 12 } : { anno: year, mese: month - 1 };
  const next = month === 12 ? { anno: year + 1, mese: 1 } : { anno: year, mese: month + 1 };
  const href = (p: { anno: number; mese: number }) => `/finanze/riepilogo?anno=${p.anno}&mese=${p.mese}`;
  const activeGoals = goals.filter((g) => g.stato === "attivo");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <Link href="/finanze" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground max-md:min-h-11">
        <ArrowLeft className="h-3.5 w-3.5" /> Finanze
      </Link>
      <SectionHeader icon={BarChart3} eyebrow="Finanze" title="Riepilogo" subtitle="Mese per mese e per tutto l'anno." />

      {failed ? (
        <LoadErrorBox />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Link href={href(prev)} aria-label="Mese precedente" className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted max-md:h-11 max-md:w-11">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <h2 className="min-w-40 text-center text-lg font-semibold capitalize">
              {MONTHS_LONG[month - 1]} {year}
            </h2>
            <Link href={href(next)} aria-label="Mese successivo" className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted max-md:h-11 max-md:w-11">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Entrate del mese" value={formatMoney(monthSum.entrate)} tone="text-tone-success-fg" />
            <Stat label="Uscite del mese" value={formatMoney(monthSum.uscite)} tone="text-tone-danger-fg" />
            <Stat label="Risparmiato nel mese" value={formatMoney(monthSum.entrate - monthSum.uscite)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card/40 p-5">
              <h2 className="mb-3 text-sm font-semibold">Uscite per categoria</h2>
              <HBars bars={bars} format={formatMoney} />
            </section>
            <section className="rounded-xl border border-border bg-card/40 p-5">
              <h2 className="mb-3 text-sm font-semibold">Budget del mese</h2>
              {budgets.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Imposta un budget mensile nelle <Link href="/finanze/categorie" className="underline">categorie</Link> per vederlo qui.
                </p>
              ) : (
                <div className="space-y-3">
                  {budgets.map((b) => (
                    <div key={b.id}>
                      <ProgressBar value={b.spent} max={b.budget} label={`${b.name}: ${formatMoney(b.spent)} di ${formatMoney(b.budget)}`} />
                      {b.spent > b.budget && <p className="mt-0.5 text-[11px] text-tone-danger-fg">Superato di {formatMoney(b.spent - b.budget)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="space-y-4 rounded-xl border border-border bg-card/40 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">Anno {year}</h2>
              <p className="text-xs text-muted-foreground">
                Entrate {formatMoney(yearSum.entrate)} · Uscite {formatMoney(yearSum.uscite)} · Saldo {formatMoney(yearSum.entrate - yearSum.uscite)}
              </p>
            </div>
            <MonthColumns months={months} format={formatMoney} />
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card/40 p-5">
            <h2 className="text-sm font-semibold">Obiettivi di risparmio</h2>
            {activeGoals.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nessun obiettivo attivo. <Link href="/finanze/obiettivi/nuovo" className="underline">Creane uno</Link>.
              </p>
            ) : (
              activeGoals.map((g) => (
                <Link key={g.id} href={detailHref(COLLECTIONS.goals, g.id)} className="block hover:opacity-80">
                  <ProgressBar
                    value={Number(g.accantonato_cent)}
                    max={Number(g.obiettivo_cent)}
                    label={`${g.nome}: ${formatMoney(Number(g.accantonato_cent))} di ${formatMoney(Number(g.obiettivo_cent))}`}
                  />
                </Link>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
