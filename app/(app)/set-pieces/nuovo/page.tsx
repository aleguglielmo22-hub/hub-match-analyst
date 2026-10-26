import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { SetPieceForm } from "@/components/set-pieces/set-piece-form";
import { getMyPreferences, getSharedLookups } from "@/app/(app)/lookups/actions";
import { emptySetPieceForm } from "@/lib/schemas/set-pieces";

export const metadata = {
  title: "Aggiungi schema · Set Pieces DB",
};

export const dynamic = "force-dynamic";

export default async function NuovoSetPiecePage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const [lookups, prefs] = await Promise.all([getSharedLookups(), getMyPreferences()]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <SetPieceForm
        lookups={lookups}
        myTeamId={prefs.my_team_id}
        defaults={emptySetPieceForm({
          myTeamId: prefs.my_team_id,
          seasonId: prefs.current_season_id,
          competitionId: prefs.main_competition_id,
        })}
      />
    </div>
  );
}
