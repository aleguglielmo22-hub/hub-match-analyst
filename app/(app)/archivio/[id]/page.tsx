import { notFound, redirect } from "next/navigation";
import { getArchiveItem } from "@/app/(app)/archivio/actions";
import { ArchiveDetail } from "@/components/archivio/archive-detail";
import { PageLoadError } from "@/components/app/load-error";
import { getArchiveLinks } from "@/app/(app)/collegamenti/actions";

export const dynamic = "force-dynamic";

export default async function DettaglioVocePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getArchiveItem(id);
  if (!res.ok) {
    if (res.reason === "not_found") notFound();
    return <PageLoadError />;
  }
  const item = res.data;
  // Se è nel cestino, la pagina dettaglio non è il posto giusto: rimanda al cestino.
  if (item.deleted_at) redirect("/cestino?sezione=cloud");

  const links = await getArchiveLinks(item.id);
  return <ArchiveDetail item={item} links={links} />;
}
