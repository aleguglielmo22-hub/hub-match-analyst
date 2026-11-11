import { CollectionListPage } from "@/components/hub/pages";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  return <CollectionListPage area="benessere" slug={collection} />;
}
