import { notFound, redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { getSetPieceForEdit } from "@/app/(app)/set-pieces/actions";
import { SetPieceForm } from "@/components/set-pieces/set-piece-form";
import { PageLoadError } from "@/components/app/load-error";

export const metadata = {
  title: "Modifica schema · Set Pieces DB",
};

export const dynamic = "force-dynamic";

export default async function ModificaSetPiecePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const res = await getSetPieceForEdit(id);
  if (!res.ok) {
    if (res.reason === "not_found") notFound();
    return <PageLoadError />;
  }
  const sp = res.data;
  // Solo creatore o owner del workspace: in caso contrario torna al dettaglio.
  if (!sp.can_edit) redirect(`/set-pieces/${id}`);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <SetPieceForm
        existing={{ id: sp.id, values: sp.values, updatedAt: sp.updated_at }}
      />
    </div>
  );
}
