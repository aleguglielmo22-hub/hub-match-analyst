import { CollectionDetailPage } from "@/components/hub/pages";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const { collection, id } = await params;
  return <CollectionDetailPage area="studi" slug={collection} id={id} />;
}
