/**
 * Data dell'ultimo backup riuscito, salvata nel browser (solo promemoria:
 * può sparire con la pulizia dei dati del browser o in navigazione privata).
 */
const KEY = "football-hub:last-backup";

export const BACKUP_REMINDER_DAYS = 7;

export function getLastBackup(): Date | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function setLastBackup(date: Date): void {
  try {
    window.localStorage.setItem(KEY, date.toISOString());
  } catch {
    // Storage non disponibile (navigazione privata): il promemoria resterà attivo.
  }
}
