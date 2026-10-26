import { notFound, redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { getPlayerForEdit } from "@/app/(app)/scouting/actions";
import { PlayerForm } from "@/components/scouting/player-form";
import { PageLoadError } from "@/components/app/load-error";
import { getSharedLookups } from "@/app/(app)/lookups/actions";

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

  const res = await getPlayerForEdit(id);
  if (!res.ok) {
    if (res.reason === "not_found") notFound();
    return <PageLoadError />;
  }
  const player = res.data;
  // Solo creatore o owner del workspace: in caso contrario torna al dettaglio.
  if (!player.can_edit) redirect(`/scouting/${id}`);

  const { teams } = await getSharedLookups();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <PlayerForm
        teams={teams}
        existing={{
          id: player.id,
          values: player.values,
          updatedAt: player.updated_at,
        }}
      />
    </div>
  );
}
