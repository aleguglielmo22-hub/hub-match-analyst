import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { SetPieceForm } from "@/components/set-pieces/set-piece-form";

export const metadata = {
  title: "Aggiungi schema · Set Pieces DB",
};

export default async function NuovoSetPiecePage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <SetPieceForm />
    </div>
  );
}
