import { CollectionNewPage } from "@/components/hub/pages";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ collection }, sp] = await Promise.all([params, searchParams]);
  const modello = Array.isArray(sp.modello) ? sp.modello[0] : sp.modello;
  return <CollectionNewPage area="benessere" slug={collection} template={modello} />;
}
