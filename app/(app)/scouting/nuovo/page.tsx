import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { PlayerForm } from "@/components/scouting/player-form";

export const metadata = {
  title: "Aggiungi giocatore · Scouting DB",
};

export default async function NuovoGiocatorePage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <PlayerForm />
    </div>
  );
}
