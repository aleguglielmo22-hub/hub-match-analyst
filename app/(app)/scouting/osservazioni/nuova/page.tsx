import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { ObservationForm } from "@/components/scouting/observation-form";
import { getObservationLookups, getObservationPlayer } from "../actions";

export const metadata = {
  title: "Nuova osservazione · Scouting DB",
};

export const dynamic = "force-dynamic";

export default async function NuovaOsservazionePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const sp = await searchParams;
  const playerId = Array.isArray(sp.giocatore) ? sp.giocatore[0] : sp.giocatore;
  const [lookups, player] = await Promise.all([
    getObservationLookups(),
    playerId ? getObservationPlayer(playerId) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
      <ObservationForm lookups={lookups} initialPlayer={player} />
    </div>
  );
}
