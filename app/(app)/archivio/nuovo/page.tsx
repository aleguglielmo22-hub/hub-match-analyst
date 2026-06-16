import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { getLookupOptions } from "@/app/(app)/archivio/actions";
import { ArchiveForm } from "@/components/archivio/archive-form";

export const metadata = {
  title: "Nuova voce · Cloud",
};

export default async function NuovaVocePage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const lookups = await getLookupOptions();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <ArchiveForm workspaceId={workspace.id} initialLookups={lookups} />
    </div>
  );
}
