import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { SectionHeader } from "@/components/app/section-header";
import { LoadErrorBox } from "@/components/app/load-error";
import { ReviewButton } from "@/components/hub/review-button";
import { formatDate } from "@/lib/hub/fields";
import { logSafeError } from "@/lib/hub/server";
import { reviewQueue, type ReviewItem } from "@/lib/hub/summary";

export const metadata = { title: "Da ripassare · Studi" };
export const dynamic = "force-dynamic";

const KIND: Record<ReviewItem["key"], string> = {
  chapters: "Capitolo",
  modules: "Lezione",
  highlights: "Highlight",
  readings: "Lettura",
};

function ReviewList({ items, actionable }: { items: ReviewItem[]; actionable: boolean }) {
  return (
    <ul className="divide-y divide-border/60 rounded-xl border border-border">
      {items.map((r) => (
        <li key={`${r.key}-${r.id}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
          <Link href={r.href} className="min-w-0 flex-1 hover:text-primary-text">
            <span className="block text-sm font-medium">{r.title}</span>
            <span className="text-xs text-muted-foreground">
              {KIND[r.key]} · {r.context} · ripasso {r.step} di 3 ·{" "}
              {r.days < 0 ? `in ritardo di ${-r.days} giorni` : r.days === 0 ? "oggi" : formatDate(r.due)}
            </span>
          </Link>
          {actionable && <ReviewButton collectionKey={r.key} id={r.id} />}
        </li>
      ))}
    </ul>
  );
}

/**
 * Ripasso a distanza: ogni capitolo, lezione, lettura o highlight completato
 * torna qui dopo 1 giorno, 1 settimana e 1 mese.
 */
export default async function RipassoPage() {
  let items: ReviewItem[] | null = null;
  try {
    items = await reviewQueue();
  } catch (err) {
    logSafeError("Ripassi", err);
  }
  const due = items?.filter((r) => r.days <= 0) ?? [];
  const next = items?.filter((r) => r.days > 0 && r.days <= 30) ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <Link href="/studi" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground max-md:min-h-11">
        <ArrowLeft className="h-3.5 w-3.5" /> Studi
      </Link>
      <SectionHeader
        icon={RotateCcw}
        eyebrow="Studi"
        title="Da ripassare"
        subtitle="Quando completi un capitolo, una lezione o una lettura, torna qui dopo 1 giorno, 1 settimana e 1 mese."
      />
      {items === null ? (
        <LoadErrorBox />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Oggi ({due.length})</h2>
            {due.length ? <ReviewList items={due} actionable /> : <p className="text-sm text-muted-foreground">Niente da ripassare oggi. 👏</p>}
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Nei prossimi 30 giorni ({next.length})</h2>
            {next.length ? <ReviewList items={next} actionable={false} /> : <p className="text-sm text-muted-foreground">Nessun ripasso in arrivo.</p>}
          </section>
        </>
      )}
    </div>
  );
}
