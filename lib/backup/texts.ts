import type { BackupBucket, BackupTableName } from "./tables";

export type ManifestFile = {
  bucket: BackupBucket;
  percorso_originale: string;
  percorso_nello_zip: string;
  dimensione_byte: number | null;
  registrato_in_tabella: boolean;
};

export type ManifestSkippedFile = {
  bucket: BackupBucket;
  percorso_originale: string;
  motivo: string;
};

export type BackupManifest = {
  // Identificativo tecnico del formato: invariato dopo il cambio di nome,
  // così un futuro ripristino riconosce anche i backup già fatti.
  formato: "football-hub-backup";
  versione_formato: 1;
  creato_il: string;
  versione_app: string;
  file_inclusi: boolean;
  tabelle: Record<BackupTableName, { righe: number | null; errore?: string }>;
  elenco_storage: Record<BackupBucket, string>;
  file: ManifestFile[];
  file_non_scaricati: ManifestSkippedFile[];
};

export function buildReadme(m: BackupManifest): string {
  const createdAt = new Date(m.creato_il).toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
  });
  const tableErrors = Object.entries(m.tabelle).filter(([, t]) => t.errore);
  const lines = [
    "AG WORKSPACE — BACKUP DEI DATI",
    "==============================",
    "",
    `Creato il: ${createdAt} (ora italiana)`,
    `Versione dell'app: ${m.versione_app}`,
    "",
    "COSA CONTIENE QUESTO ZIP",
    "------------------------",
    "",
    "json/   La copia COMPLETA per un futuro ripristino: una tabella per file,",
    "        con tutte le colonne, tutti gli identificativi e anche le voci nel",
    "        cestino. Non modificare questi file.",
    "",
    "csv/    Gli stessi dati in versione leggibile con Excel (date in formato",
    "        gg/mm/aaaa, ora italiana; decimali con la virgola; liste separate",
    "        da \" | \"; sì/no per i valori vero/falso).",
    "",
    "files/  I file caricati nell'app (video, PDF, immagini…), con i percorsi",
    "        originali: files/archivio/... (Cloud) e files/media/... (allegati di",
    "        Scouting, Set Pieces e Training).",
    "        files/_non-registrati/... contiene file trovati nello spazio di",
    "        archiviazione ma non collegati a nessuna voce dell'app.",
    m.file_inclusi
      ? ""
      : "        ATTENZIONE: questo backup è stato creato SENZA i file caricati.",
    "",
    "manifest.json   Riepilogo tecnico: data, versione, numero di righe per",
    "                tabella, elenco dei file e quelli non scaricati con il motivo.",
    "",
    "COME APRIRE I CSV IN EXCEL",
    "--------------------------",
    "",
    "1. Estrai lo ZIP (tasto destro → \"Estrai tutto\" su Windows, doppio clic su Mac).",
    "2. Apri la cartella csv e fai doppio clic sul file che ti interessa.",
    "   Excel in italiano lo apre già diviso in colonne.",
    "3. Se vedi tutto in una sola colonna: in Excel vai su Dati → Da testo/CSV,",
    "   scegli il file, imposta \"Origine file: 65001: Unicode (UTF-8)\" e",
    "   \"Delimitatore: Punto e virgola\".",
    "   Con Numbers (Mac) o Google Fogli basta aprire o importare il file.",
    "",
    "CONSIGLI",
    "--------",
    "",
    "- Conserva questo ZIP in un posto diverso dal computer: disco esterno,",
    "  chiavetta o un servizio cloud personale.",
    "- Fai un nuovo backup almeno una volta a settimana.",
  ];
  if (tableErrors.length > 0 || m.file_non_scaricati.length > 0) {
    lines.push("", "ATTENZIONE: BACKUP INCOMPLETO", "-----------------------------", "");
    for (const [name, t] of tableErrors) {
      lines.push(`- Tabella ${name} non letta: ${t.errore}`);
    }
    if (m.file_non_scaricati.length > 0) {
      lines.push(
        `- ${m.file_non_scaricati.length} file non scaricati: l'elenco e il motivo sono in manifest.json.`,
      );
    }
  }
  return lines.join("\r\n") + "\r\n";
}
