import { Suspense } from "react";
import { LayoutDashboard } from "lucide-react";
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
  title: "Dashboard · Football Hub",
};

export const dynamic = "force-dynamic";

/**
 * Home Dashboard / Centro di controllo.
 *
 * Pattern di streaming server-side: ogni sezione è incapsulata in un
 * <Suspense> con il proprio skeleton, così la pagina inizia a renderizzare
 * subito (shell statico) e ciascun blocco appare appena la sua query
 * è pronta. Le query corrono in parallelo all'interno di ogni Server
 * Component asincrono.
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <SectionHeader
        icon={LayoutDashboard}
        eyebrow="Dashboard"
        title="Centro di controllo"
        subtitle="Riepilogo dei dati analitici globali del workspace."
      />

      {/* A. KPI cards (4 colonne su lg) */}
      <Suspense fallback={<KpiCardsSkeleton />}>
        <KpiCards />
      </Suspense>

      {/* B. Attività recente + azioni rapide (2 colonne su lg) */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Suspense fallback={<RecentActivitySkeleton />}>
          <RecentActivity />
        </Suspense>
        <QuickActions />
      </div>

      {/* C. Widget efficacia piazzati */}
      <Suspense fallback={<EfficacyWidgetSkeleton />}>
        <SetPiecesEfficacyWidget />
      </Suspense>
    </div>
  );
}
