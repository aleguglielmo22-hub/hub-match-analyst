import { notFound, redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { getPlayerForEdit } from "@/app/(app)/scouting/actions";
import { PlayerForm } from "@/components/scouting/player-form";

export const metadata = {
  title: "Modifica giocatore · Scouting DB",
};

export const dynamic = "force-dynamic";

export default async function ModificaGiocatorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const player = await getPlayerForEdit(id);
  if (!player) notFound();
  // Solo creatore o owner del workspace: in caso contrario torna al dettaglio.
  if (!player.can_edit) redirect(`/scouting/${id}`);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <PlayerForm existing={{ id: player.id, values: player.values }} />
    </div>
  );
}
