/**
 * Impronta di un file video: SHA-256 di dimensione + tre blocchi da 1 MB
 * (inizio, metà, fine). Veloce anche su file da molti GB e sufficiente a
 * riconoscere lo stesso file spostato o rinominato. Testato in fingerprint.test.mjs.
 */
import { createHash } from "node:crypto";
import { open } from "node:fs/promises";

export const FINGERPRINT_BLOCK = 1024 * 1024;

export async function fingerprintFile(path: string): Promise<{ fingerprint: string; sizeBytes: number }> {
  const handle = await open(path, "r");
  try {
    const { size } = await handle.stat();
    const hash = createHash("sha256").update(`ag-tag-fp-v1:${size}:`);
    const offsets = [0, Math.max(0, Math.floor(size / 2 - FINGERPRINT_BLOCK / 2)), Math.max(0, size - FINGERPRINT_BLOCK)];
    const buf = Buffer.alloc(FINGERPRINT_BLOCK);
    for (const offset of offsets) {
      const { bytesRead } = await handle.read(buf, 0, Math.min(FINGERPRINT_BLOCK, size), offset);
      hash.update(buf.subarray(0, bytesRead));
    }
    return { fingerprint: hash.digest("hex"), sizeBytes: size };
  } finally {
    await handle.close();
  }
}
