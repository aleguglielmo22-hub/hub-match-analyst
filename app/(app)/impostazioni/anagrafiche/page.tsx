import { redirect } from "next/navigation";
import { BookUser } from "lucide-react";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { SettingsTabs } from "@/components/impostazioni/settings-tabs";
import { LookupsManager } from "@/components/impostazioni/lookups-manager";
import { PageLoadError } from "@/components/app/load-error";
import { listLookupsWithUsage } from "./actions";

export const metadata = {
  title: "Anagrafiche · Impostazioni",
};

export const dynamic = "force-dynamic";

export default async function AnagrafichePage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");
  // Solo l'OWNER vede le Impostazioni.
  if (!workspace.isOwner) redirect("/archivio");

  const data = await listLookupsWithUsage();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/30 text-primary">
            <BookUser className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
              Impostazioni
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Anagrafiche
            </h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Squadre, competizioni e stagioni condivise da Cloud, Set Pieces e Osservazioni: rinomina o unisci i doppioni.
        </p>
      </div>

      <SettingsTabs active="anagrafiche" />

      {data ? <LookupsManager data={data} /> : <PageLoadError />}
    </div>
  );
}
