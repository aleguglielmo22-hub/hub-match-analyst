import { redirect } from "next/navigation";
import { DatabaseBackup } from "lucide-react";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { SettingsTabs } from "@/components/impostazioni/settings-tabs";
import { BackupPanel } from "@/components/impostazioni/backup-panel";

export const metadata = {
  title: "Backup · Impostazioni",
};

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");
  // Solo l'OWNER vede questa pagina.
  if (!workspace.isOwner) redirect("/dashboard");

  // Commit pubblicato, fornito automaticamente da Vercel (variabile di sistema).
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const appVersion = sha ? sha.slice(0, 7) : "sconosciuta (sviluppo locale)";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/30 text-primary">
            <DatabaseBackup className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
              Impostazioni
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Backup
            </h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Scarica una copia completa dei tuoi dati. Il file viene preparato
          direttamente in questo browser.
        </p>
      </div>

      <SettingsTabs active="backup" />

      <BackupPanel appVersion={appVersion} />
    </div>
  );
}
