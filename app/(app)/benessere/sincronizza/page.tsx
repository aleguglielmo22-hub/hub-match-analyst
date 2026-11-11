import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { SectionHeader } from "@/components/app/section-header";
import { HealthSyncSetup } from "@/components/hub/health-sync-setup";
import { hubClient, logSafeError, requireOwner } from "@/lib/hub/server";

export const metadata = { title: "Sincronizzazione · Benessere" };
export const dynamic = "force-dynamic";

export default async function SincronizzaPage() {
  let configured = false;
  let lastSync: string | null = null;
  try {
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { data, error } = await supabase.from("health_sync").select("last_sync_at").eq("workspace_id", workspace.id).maybeSingle();
    if (error) throw error;
    configured = !!data;
    const at = (data as { last_sync_at: string | null } | null)?.last_sync_at;
    if (at) lastSync = new Date(at).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" });
  } catch (err) {
    logSafeError("Sincronizzazione salute", err);
  }
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <Link href="/benessere/parametri" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground max-md:min-h-11">
        <ArrowLeft className="h-3.5 w-3.5" /> Parametri vitali
      </Link>
      <SectionHeader icon={RefreshCw} eyebrow="Benessere" title="Sincronizzazione automatica" subtitle="Peso, sonno, passi e battito arrivano da soli dall'iPhone (e da Zepp, attraverso Apple Salute)." />
      <HealthSyncSetup configured={configured} lastSync={lastSync} />
    </div>
  );
}
