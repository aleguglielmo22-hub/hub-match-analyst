import { Suspense } from "react";
import { Briefcase } from "lucide-react";
import { AREAS } from "@/components/app/nav-items";
import Link from "next/link";
import { SectionHeader } from "@/components/app/section-header";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SetPiecesEfficacyWidget } from "@/components/dashboard/set-pieces-efficacy";
import {
  EfficacyWidgetSkeleton,
  KpiCardsSkeleton,
  RecentActivitySkeleton,
} from "@/components/dashboard/dashboard-skeletons";

export const metadata = {
  title: "Lavoro · AG Workspace",
};

export const dynamic = "force-dynamic";

/**
 * Area Lavoro: il centro di controllo del match analyst (era la Dashboard).
 *
 * Pattern di streaming server-side: ogni sezione è incapsulata in un
 * <Suspense> con il proprio skeleton, così la pagina inizia a renderizzare
 * subito (shell statico) e ciascun blocco appare appena la sua query
 * è pronta. Le query corrono in parallelo all'interno di ogni Server
 * Component asincrono.
 */
export default async function LavoroPage() {
  const lavoro = AREAS.find((a) => a.key === "lavoro")!;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <SectionHeader
        icon={Briefcase}
        eyebrow="Lavoro"
        title="Centro di controllo"
        subtitle="Scouting, calci piazzati, training e Cloud: il lavoro da match analyst."
      />

      <nav aria-label="Sezioni del Lavoro" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {lavoro.children.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card/40 p-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted/30 max-md:min-h-12"
            >
              <Icon className="h-4 w-4 text-primary-text" />
              {s.label}
            </Link>
          );
        })}
      </nav>

      
      {/* Su mobile le azioni rapide vengono prima dei contatori. */}
      <div className="md:hidden">
        <QuickActions />
      </div>

      {/* A. KPI cards (4 colonne su lg) */}
      <Suspense fallback={<KpiCardsSkeleton />}>
        <KpiCards />
      </Suspense>

      {/* B. Attività recente + azioni rapide (2 colonne su lg) */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Suspense fallback={<RecentActivitySkeleton />}>
          <RecentActivity />
        </Suspense>
        <div className="hidden md:block">
          <QuickActions />
        </div>
      </div>

      {/* C. Widget efficacia piazzati */}
      <Suspense fallback={<EfficacyWidgetSkeleton />}>
        <SetPiecesEfficacyWidget />
      </Suspense>
    </div>
  );
}
