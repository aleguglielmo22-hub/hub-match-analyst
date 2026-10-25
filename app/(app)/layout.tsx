import { redirect } from "next/navigation";
import { getAuthUser, getCurrentWorkspace } from "@/lib/supabase/queries";
import { AppSidebar } from "@/components/app/app-sidebar";
import { MobileHeader } from "@/components/app/mobile-header";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";
import { MissingConfigNotice } from "@/components/app/missing-config-notice";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { ACCESS_DENIED_PARAM, isEmailAllowed } from "@/lib/auth/allowlist";

/**
 * Layout autenticato: sidebar (desktop) o drawer (mobile) + area contenuto.
 * Tutta la zona (app) richiede sessione: in assenza di utente forziamo /login.
 * Solo gli account in lib/auth/allowlist.ts possono entrare.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!getSupabaseConfig()) return <MissingConfigNotice />;

  // Stessa verifica riusata da getCurrentWorkspace (una sola chiamata per richiesta).
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }
  // Seconda barriera (la prima è proxy.ts): account non autorizzato → login.
  // Il proxy, su /login, chiude la sessione e mostra il messaggio.
  if (!isEmailAllowed(user.email)) {
    redirect(`/login?errore=${ACCESS_DENIED_PARAM}`);
  }

  // Se il DB non risponde la shell resta visibile: l'errore lo mostra la pagina.
  const workspace = await getCurrentWorkspace().catch(() => null);
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
        {/* Su mobile spazio in fondo per la barra di navigazione (o la barra Salva). */}
        <main className="flex-1 overflow-y-auto max-md:pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
