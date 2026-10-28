import { redirect } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { SettingsTabs } from "@/components/impostazioni/settings-tabs";
import { PreferencesForm } from "@/components/impostazioni/preferences-form";
import { getMyPreferences, getSharedLookups } from "@/app/(app)/lookups/actions";

export const metadata = {
  title: "Preferenze · Impostazioni",
};

export const dynamic = "force-dynamic";

export default async function PreferenzePage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");
  // Solo l'OWNER vede le Impostazioni.
  if (!workspace.isOwner) redirect("/dashboard");

  const [prefs, lookups] = await Promise.all([getMyPreferences(), getSharedLookups()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/30 text-primary">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
              Impostazioni
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Preferenze
            </h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          La tua squadra, la stagione e la competizione che usi di più: diventano i valori predefiniti dei nuovi inserimenti, su telefono e computer.
        </p>
      </div>

      <SettingsTabs active="preferenze" />

      <PreferencesForm initial={prefs} lookups={lookups} />
    </div>
  );
}
