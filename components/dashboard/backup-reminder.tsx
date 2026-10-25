"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DatabaseBackup } from "lucide-react";
import { BACKUP_REMINDER_DAYS, getLastBackup } from "@/lib/backup/last-backup";

/**
 * Avviso discreto in Dashboard: nessun backup su questo dispositivo, oppure
 * l'ultimo ha più di BACKUP_REMINDER_DAYS giorni. Mostrato solo all'owner.
 */
export function BackupReminder() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const last = getLastBackup();
    const ageDays = last ? (Date.now() - last.getTime()) / 86_400_000 : null;
    // localStorage è disponibile solo nel browser: lettura al montaggio.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage(
      ageDays === null
        ? "Non hai ancora fatto un backup dei tuoi dati."
        : ageDays > BACKUP_REMINDER_DAYS
          ? `L'ultimo backup risale a ${Math.floor(ageDays)} giorni fa.`
          : null,
    );
  }, []);

  if (!message) return null;

  return (
    <Link
      href="/impostazioni/backup"
      className="flex min-h-11 items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <DatabaseBackup className="h-4 w-4 shrink-0 text-primary" />
      <span className="flex-1">{message}</span>
      <span className="shrink-0 font-medium text-primary">Fai un backup →</span>
    </Link>
  );
}
