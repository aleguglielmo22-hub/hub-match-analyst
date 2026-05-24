import { notFound, redirect } from "next/navigation";
import { getArchiveItem } from "@/app/(app)/archivio/actions";
import { ArchiveDetail } from "@/components/archivio/archive-detail";

export const dynamic = "force-dynamic";

export default async function DettaglioVocePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getArchiveItem(id);

  if (!item) notFound();
  // Se è nel cestino, la pagina dettaglio non è il posto giusto: rimanda al cestino.
  if (item.deleted_at) redirect("/archivio/cestino");

  return <ArchiveDetail item={item} />;
}
