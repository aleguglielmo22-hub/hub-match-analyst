import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { PlayerForm } from "@/components/scouting/player-form";
import { getSharedLookups } from "@/app/(app)/lookups/actions";

export const metadata = {
  title: "Aggiungi giocatore · Scouting DB",
};

export const dynamic = "force-dynamic";

export default async function NuovoGiocatorePage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const { teams } = await getSharedLookups();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <PlayerForm teams={teams} />
    </div>
  );
}
