/**
 * Backup completo costruito NEL BROWSER: i dati vengono letti con la sessione
 * dell'utente (RLS rispettata), tabella per tabella a blocchi, e lo ZIP viene
 * assemblato in memoria con fflate. Nessun limite di durata/dimensione delle
 * funzioni Vercel, perché il server non viene coinvolto.
 */
import { Zip, ZipDeflate, ZipPassThrough, strToU8 } from "fflate";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { rowsToCsv } from "./csv";
import {
  BACKUP_BUCKETS,
  BACKUP_PAGE_SIZE,
  BACKUP_TABLES,
  type BackupBucket,
  type BackupTableName,
} from "./tables";
import {
  buildReadme,
  type BackupManifest,
  type ManifestFile,
  type ManifestSkippedFile,
} from "./texts";

const SIGNED_URL_TTL = 10 * 60; // 10 minuti: l'URL serve solo per il download immediato
/** Stima grezza del peso di una riga (JSON + CSV) per la previsione iniziale. */
const ESTIMATED_BYTES_PER_ROW = 1500;

export type BackupFileEntry = {
  bucket: BackupBucket;
  path: string;
  size: number | null;
  registered: boolean;
};

export type BackupPlan = {
  rowCounts: Record<BackupTableName, number | null>;
  files: BackupFileEntry[];
  /** Esito dell'elenco dei bucket (per i file non registrati). */
  listing: Record<BackupBucket, string>;
  estimatedDataBytes: number;
  filesBytes: number;
};

export type BackupProgress = {
  phase: "tabelle" | "file" | "zip";
  tablesDone: number;
  tablesTotal: number;
  filesDone: number;
  filesTotal: number;
};

export type BackupResult = {
  blob: Blob;
  filename: string;
  manifest: BackupManifest;
  tableErrors: number;
  filesOk: number;
  filesFailed: number;
};

// Accesso generico per nome tabella: i tipi generati non gestiscono bene un nome variabile.
function getClient(): SupabaseClient {
  return createClient() as unknown as SupabaseClient;
}

function zipPathFor(f: BackupFileEntry): string {
  return f.registered
    ? `files/${f.bucket}/${f.path}`
    : `files/_non-registrati/${f.bucket}/${f.path}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err)
    return String((err as { message: unknown }).message);
  return String(err);
}

/** Legge tutte le righe visibili di una tabella, a blocchi di BACKUP_PAGE_SIZE. */
async function fetchAllRows(
  supabase: SupabaseClient,
  table: (typeof BACKUP_TABLES)[number],
  columns = "*",
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += BACKUP_PAGE_SIZE) {
    let q = supabase.from(table.name).select(columns);
    for (const col of table.orderBy) q = q.order(col, { ascending: true });
    const { data, error } = await q.range(from, from + BACKUP_PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    out.push(...rows);
    if (rows.length < BACKUP_PAGE_SIZE) return out;
  }
}

/** Elenco ricorsivo degli oggetti di un bucket sotto un prefisso (cartella). */
async function listBucketRecursive(
  supabase: SupabaseClient,
  bucket: BackupBucket,
  prefix: string,
): Promise<{ path: string; size: number | null }[]> {
  const out: { path: string; size: number | null }[] = [];
  for (let offset = 0; ; offset += BACKUP_PAGE_SIZE) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: BACKUP_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    const entries = data ?? [];
    for (const e of entries) {
      if (e.name === ".emptyFolderPlaceholder") continue;
      const path = `${prefix}/${e.name}`;
      // Le "cartelle" hanno id nullo: si scende ricorsivamente.
      if (!e.id) out.push(...(await listBucketRecursive(supabase, bucket, path)));
      else
        out.push({
          path,
          size: typeof e.metadata?.size === "number" ? e.metadata.size : null,
        });
    }
    if (entries.length < BACKUP_PAGE_SIZE) return out;
  }
}

const tableByName = (name: BackupTableName) =>
  BACKUP_TABLES.find((t) => t.name === name)!;

/**
 * Preparazione (prima del download): conteggio righe, elenco dei file
 * registrati nelle tabelle e dei file presenti nei bucket ma non registrati.
 */
export async function prepareBackup(): Promise<BackupPlan> {
  const supabase = getClient();

  const counts = await Promise.all(
    BACKUP_TABLES.map(async (t) => {
      const { count, error } = await supabase
        .from(t.name)
        .select("*", { count: "exact", head: true });
      return [t.name, error ? null : (count ?? 0)] as const;
    }),
  );
  const rowCounts = Object.fromEntries(counts) as BackupPlan["rowCounts"];

  // File registrati: Cloud → bucket "archivio", allegati → bucket "media".
  const [archiveFiles, attachments, workspaces] = await Promise.all([
    fetchAllRows(supabase, tableByName("archive_files"), "id, file_path, file_size_bytes"),
    fetchAllRows(supabase, tableByName("attachments"), "id, file_path, file_size_bytes"),
    fetchAllRows(supabase, tableByName("workspaces"), "id"),
  ]);

  const files: BackupFileEntry[] = [];
  const known: Record<BackupBucket, Set<string>> = {
    archivio: new Set(),
    media: new Set(),
  };
  const addRegistered = (bucket: BackupBucket, rows: Record<string, unknown>[]) => {
    for (const r of rows) {
      const path = String(r.file_path);
      if (known[bucket].has(path)) continue;
      known[bucket].add(path);
      files.push({
        bucket,
        path,
        size: typeof r.file_size_bytes === "number" ? r.file_size_bytes : null,
        registered: true,
      });
    }
  };
  addRegistered("archivio", archiveFiles);
  addRegistered("media", attachments);

  // File non registrati: elenco dei bucket per ogni workspace accessibile.
  const listing = {} as BackupPlan["listing"];
  for (const bucket of BACKUP_BUCKETS) {
    try {
      let objects = 0;
      for (const w of workspaces) {
        const listed = await listBucketRecursive(supabase, bucket, String(w.id));
        objects += listed.length;
        for (const obj of listed) {
          if (known[bucket].has(obj.path)) continue;
          known[bucket].add(obj.path);
          files.push({ bucket, path: obj.path, size: obj.size, registered: false });
        }
      }
      listing[bucket] = `elenco riuscito: ${objects} oggetti trovati`;
    } catch (err) {
      listing[bucket] = `elenco non consentito o non riuscito (${errorMessage(err)}): eventuali file non registrati non sono inclusi`;
    }
  }

  const totalRows = Object.values(rowCounts).reduce<number>((s, n) => s + (n ?? 0), 0);
  return {
    rowCounts,
    files,
    listing,
    estimatedDataBytes: totalRows * ESTIMATED_BYTES_PER_ROW,
    filesBytes: files.reduce((s, f) => s + (f.size ?? 0), 0),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function backupFilename(d: Date): string {
  return `ag-workspace-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.zip`;
}

/** Esegue il backup e restituisce lo ZIP pronto da scaricare. */
export async function runBackup(
  plan: BackupPlan,
  opts: {
    includeFiles: boolean;
    appVersion: string;
    onProgress: (p: BackupProgress) => void;
  },
): Promise<BackupResult> {
  const supabase = getClient();
  const startedAt = new Date();

  const chunks: Uint8Array[] = [];
  let resolveZip!: () => void;
  let rejectZip!: (err: Error) => void;
  const zipDone = new Promise<void>((res, rej) => {
    resolveZip = res;
    rejectZip = rej;
  });
  const zip = new Zip((err, data, final) => {
    if (err) return rejectZip(err);
    chunks.push(data);
    if (final) resolveZip();
  });

  const addText = (path: string, text: string) => {
    const entry = new ZipDeflate(path, { level: 6 });
    zip.add(entry);
    entry.push(strToU8(text), true);
  };
  const addBinary = (path: string, bytes: Uint8Array) => {
    // Media già compressi (video, immagini, PDF): nessuna ricompressione.
    const entry = new ZipPassThrough(path);
    zip.add(entry);
    entry.push(bytes, true);
  };

  const filesToDownload = opts.includeFiles ? plan.files : [];
  const progress: BackupProgress = {
    phase: "tabelle",
    tablesDone: 0,
    tablesTotal: BACKUP_TABLES.length,
    filesDone: 0,
    filesTotal: filesToDownload.length,
  };
  opts.onProgress({ ...progress });

  // 1) Tabelle → json/ e csv/
  const tabelle = {} as BackupManifest["tabelle"];
  let tableErrors = 0;
  for (const table of BACKUP_TABLES) {
    try {
      const rows = await fetchAllRows(supabase, table);
      addText(`json/${table.name}.json`, JSON.stringify(rows, null, 2));
      addText(`csv/${table.name}.csv`, rowsToCsv(rows));
      tabelle[table.name] = { righe: rows.length };
    } catch (err) {
      tableErrors++;
      tabelle[table.name] = { righe: null, errore: errorMessage(err) };
    }
    progress.tablesDone++;
    opts.onProgress({ ...progress });
  }

  // 2) File caricati → files/ (un errore su un file non ferma il backup)
  progress.phase = "file";
  opts.onProgress({ ...progress });
  const manifestFiles: ManifestFile[] = [];
  const skipped: ManifestSkippedFile[] = [];
  for (const f of filesToDownload) {
    try {
      const { data, error } = await supabase.storage
        .from(f.bucket)
        .createSignedUrl(f.path, SIGNED_URL_TTL);
      if (error || !data?.signedUrl)
        throw new Error(`URL firmato non creato: ${error ? errorMessage(error) : "risposta vuota"}`);
      const res = await fetch(data.signedUrl);
      if (!res.ok) throw new Error(`download fallito (HTTP ${res.status})`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      addBinary(zipPathFor(f), bytes);
      manifestFiles.push({
        bucket: f.bucket,
        percorso_originale: f.path,
        percorso_nello_zip: zipPathFor(f),
        dimensione_byte: bytes.byteLength,
        registrato_in_tabella: f.registered,
      });
    } catch (err) {
      skipped.push({
        bucket: f.bucket,
        percorso_originale: f.path,
        motivo: errorMessage(err),
      });
    }
    progress.filesDone++;
    opts.onProgress({ ...progress });
  }
  if (!opts.includeFiles) {
    for (const f of plan.files) {
      skipped.push({
        bucket: f.bucket,
        percorso_originale: f.path,
        motivo: "opzione \"Includi i file caricati\" disattivata",
      });
    }
  }

  // 3) manifest.json + LEGGIMI.txt, chiusura ZIP
  progress.phase = "zip";
  opts.onProgress({ ...progress });
  const manifest: BackupManifest = {
    formato: "football-hub-backup",
    versione_formato: 1,
    creato_il: startedAt.toISOString(),
    versione_app: opts.appVersion,
    file_inclusi: opts.includeFiles,
    tabelle,
    elenco_storage: plan.listing,
    file: manifestFiles,
    file_non_scaricati: skipped,
  };
  addText("manifest.json", JSON.stringify(manifest, null, 2));
  addText("LEGGIMI.txt", buildReadme(manifest));
  zip.end();
  await zipDone;

  return {
    blob: new Blob(chunks as BlobPart[], { type: "application/zip" }),
    filename: backupFilename(startedAt),
    manifest,
    tableErrors,
    filesOk: manifestFiles.length,
    filesFailed: opts.includeFiles ? skipped.length : 0,
  };
}
