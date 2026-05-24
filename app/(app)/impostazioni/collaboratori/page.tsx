import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { listMembers } from "./actions";
import { InviteForm } from "@/components/impostazioni/invite-form";
import { MembersList } from "@/components/impostazioni/members-list";

export const metadata = {
  title: "Collaboratori · Impostazioni",
};

export const dynamic = "force-dynamic";

export default async function CollaboratoriPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");
  // Solo l'OWNER vede questa pagina.
  if (!workspace.isOwner) redirect("/archivio");

  const members = await listMembers();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30 text-primary">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
              Impostazioni
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Collaboratori
            </h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Invita persone che potranno vedere il tuo archivio e creare nuove
          voci. Solo tu potrai modificare le voci create dagli altri.
        </p>
      </div>

      <InviteForm />

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Membri del workspace ({members.length})
        </h2>
        <MembersList members={members} />
      </section>
    </div>
  );
}
