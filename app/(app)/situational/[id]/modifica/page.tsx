import { notFound, redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { getSituationalForEdit } from "@/app/(app)/situational/actions";
import { SituationalForm } from "@/components/situational/situational-form";
import { PageLoadError } from "@/components/app/load-error";

export const metadata = {
  title: "Modifica esercitazione · Training",
};

export const dynamic = "force-dynamic";

export default async function ModificaSituazionalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const res = await getSituationalForEdit(id);
  if (!res.ok) {
    if (res.reason === "not_found") notFound();
    return <PageLoadError />;
  }
  const s = res.data;
  // Solo creatore o owner del workspace: in caso contrario torna al dettaglio.
  if (!s.can_edit) redirect(`/situational/${id}`);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <SituationalForm
        existing={{ id: s.id, values: s.values, updatedAt: s.updated_at }}
      />
    </div>
  );
}
