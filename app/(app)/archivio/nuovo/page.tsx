import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { getLookupOptions } from "@/app/(app)/archivio/actions";
import { ArchiveForm } from "@/components/archivio/archive-form";
import { getMyPreferences } from "@/app/(app)/lookups/actions";

export const metadata = {
  title: "Nuova voce · Cloud",
};

export default async function NuovaVocePage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const [lookups, prefs] = await Promise.all([getLookupOptions(), getMyPreferences()]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <ArchiveForm
        workspaceId={workspace.id}
        initialLookups={lookups}
        defaults={{
          team_principale_id: prefs.my_team_id,
          season_id: prefs.current_season_id,
          competition_id: prefs.main_competition_id,
        }}
      />
    </div>
  );
}
