import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { SituationalForm } from "@/components/situational/situational-form";

export const metadata = {
  title: "Nuovo · Training",
};

export default async function NuovaSituazionePage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <SituationalForm />
    </div>
  );
}
