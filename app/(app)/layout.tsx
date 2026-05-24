import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { AppSidebar } from "@/components/app/app-sidebar";
import { MobileHeader } from "@/components/app/mobile-header";

/**
 * Layout autenticato: sidebar (desktop) o drawer (mobile) + area contenuto.
 * Tutta la zona (app) richiede sessione: in assenza di utente forziamo /login.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace();
  const email = user.email ?? "Utente";
  const isOwner = workspace?.isOwner ?? false;

  return (
    <div className="flex flex-1 min-h-0">
      <AppSidebar
        email={email}
        isOwner={isOwner}
        className="hidden md:flex"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader
          email={email}
          isOwner={isOwner}
          className="md:hidden"
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
