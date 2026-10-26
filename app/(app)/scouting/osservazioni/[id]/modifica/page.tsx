import { notFound, redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { PageLoadError } from "@/components/app/load-error";
import { ObservationForm } from "@/components/scouting/observation-form";
import { getObservationForEdit, getObservationLookups } from "../../actions";

export const metadata = {
  title: "Modifica osservazione · Scouting DB",
};

export const dynamic = "force-dynamic";

export default async function ModificaOsservazionePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const res = await getObservationForEdit(id);
  if (!res.ok) {
    if (res.reason === "not_found") notFound();
    return <PageLoadError />;
  }
  const obs = res.data;
  // Solo creatore o owner del workspace: in caso contrario torna al giocatore.
  if (!obs.can_edit) redirect(`/scouting/${obs.player.id}`);

  const lookups = await getObservationLookups();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
      <ObservationForm
        lookups={lookups}
        existing={{
          id: obs.id,
          player: obs.player,
          values: obs.values,
          updatedAt: obs.updated_at,
        }}
      />
    </div>
  );
}
