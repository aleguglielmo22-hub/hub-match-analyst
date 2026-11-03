/**
 * Archivio della sessione Supabase cifrato con safeStorage (chiave nel
 * Portachiavi di macOS), in un file dell'app leggibile solo dall'utente.
 * Il renderer non lo vede mai. Se la cifratura non è disponibile la sessione
 * resta solo in memoria (si rifà l'accesso a ogni avvio).
 */
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { app, safeStorage } from "electron";

export class EncryptedSessionStore {
  private data: Record<string, string> = {};
  private readonly file = join(app.getPath("userData"), "sessione.bin");
  private readonly persistent = safeStorage.isEncryptionAvailable();

  constructor() {
    if (!this.persistent || !existsSync(this.file)) return;
    try {
      this.data = JSON.parse(safeStorage.decryptString(readFileSync(this.file)));
    } catch {
      // File illeggibile (es. Portachiavi cambiato): si riparte da zero.
      this.data = {};
      rmSync(this.file, { force: true });
    }
  }

  private save() {
    if (!this.persistent) return;
    if (Object.keys(this.data).length === 0) {
      rmSync(this.file, { force: true });
      return;
    }
    writeFileSync(this.file, safeStorage.encryptString(JSON.stringify(this.data)), { mode: 0o600 });
  }

  getItem = async (key: string) => this.data[key] ?? null;
  setItem = async (key: string, value: string) => {
    this.data[key] = value;
    this.save();
  };
  removeItem = async (key: string) => {
    delete this.data[key];
    this.save();
  };
}
