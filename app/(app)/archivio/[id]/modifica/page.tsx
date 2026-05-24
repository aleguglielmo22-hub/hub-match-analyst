import { notFound, redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import {
  getArchiveItem,
  getLookupOptions,
} from "@/app/(app)/archivio/actions";
import { ArchiveForm } from "@/components/archivio/archive-form";
import type { ArchiveFormValues } from "@/lib/schemas/archivio";

export const dynamic = "force-dynamic";

export default async function ModificaVocePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const item = await getArchiveItem(id);
  if (!item) notFound();
  if (item.deleted_at) redirect("/archivio/cestino");
  if (!item.can_edit) redirect(`/archivio/${id}`);

  const lookups = await getLookupOptions();

  const initialValues: ArchiveFormValues = {
    data_lavoro: item.data_lavoro,
    season_id: item.season_id,
    team_principale_id: item.team_principale_id,
    team_avversario_id: item.team_avversario_id,
    competition_id: item.competition_id,
    ambito: item.ambito,
    categoria_lavoro: item.categoria_lavoro,
    tipo_media: item.tipo_media,
    sorgente_video: item.sorgente_video,
    titolo_archivio: item.titolo_archivio,
    descrizione_estesa: item.descrizione_estesa ?? "",
    tag_ids: item.tag_ids,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <ArchiveForm
        workspaceId={workspace.id}
        initialLookups={lookups}
        existing={{
          id: item.id,
          values: initialValues,
          files: item.files,
        }}
      />
    </div>
  );
}
