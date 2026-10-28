import { redirect } from "next/navigation";
import { getAuthUser, getCurrentWorkspace } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { PlayerForm } from "@/components/scouting/player-form";
import { getSharedLookups } from "@/app/(app)/lookups/actions";

export const metadata = {
  title: "Aggiungi giocatore · Scouting DB",
};

export const dynamic = "force-dynamic";

export default async function NuovoGiocatorePage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const [{ teams }, defaultScout] = await Promise.all([
    getSharedLookups(),
    currentUserName(workspace.userId),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <PlayerForm teams={teams} defaultScout={defaultScout} />
    </div>
  );
}

/** Nome dell'utente corrente per "Scout assegnato" (profilo, altrimenti email). */
async function currentUserName(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  const name = data?.full_name?.trim();
  if (name) return name;
  return (await getAuthUser())?.email ?? null;
}
