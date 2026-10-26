"use client";

import { createClient } from "@/lib/supabase/client";
import {
  getAttachmentWorkspaceId,
  saveAttachments,
} from "@/app/(app)/attachments/actions";
import {
  ATTACHMENTS_BUCKET,
  type AttachmentEntity,
} from "@/lib/attachments/shared";
import { uploadMimeType } from "@/lib/uploads/limits";

function slugifyFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : "";
  const base = dot > 0 ? name.slice(0, dot) : name;
  const slug = base
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);
  return `${slug || "file"}${ext}`;
}

/**
 * Carica i file su storage privato (bucket "media") e ne registra i record.
 * Path: {workspace_id}/{entity_type}/{entity_id}/{uuid}-{slug}
 * Registra i file caricati anche se altri falliscono; ritorna i nomi dei
 * file non caricati (vuoto = tutto ok).
 */
export async function uploadPendingAttachments(
  entityType: AttachmentEntity,
  entityId: string,
  files: File[],
): Promise<{ failed: string[] }> {
  if (files.length === 0) return { failed: [] };
  const allNames = files.map((f) => f.name);
  let workspaceId: string | null;
  try {
    workspaceId = await getAttachmentWorkspaceId();
  } catch {
    return { failed: allNames };
  }
  if (!workspaceId) return { failed: allNames };

  const supabase = createClient();
  const results = await Promise.allSettled(
    files.map(async (file) => {
      const fileId = crypto.randomUUID();
      const path = `${workspaceId}/${entityType}/${entityId}/${fileId}-${slugifyFilename(file.name)}`;
      const { error } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: uploadMimeType(file) ?? undefined,
          upsert: false,
        });
      if (error) throw error;
      return {
        file_name: file.name,
        file_path: path,
        file_size_bytes: file.size,
        mime_type: uploadMimeType(file),
      };
    }),
  );

  const uploaded = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const failed = files.flatMap((f, i) => (results[i].status === "rejected" ? [f.name] : []));
  if (uploaded.length === 0) return { failed };

  try {
    await saveAttachments(entityType, entityId, uploaded);
  } catch {
    // File caricati ma non registrati: la pulizia dello storage è best-effort.
    await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .remove(uploaded.map((u) => u.file_path))
      .catch(() => undefined);
    return { failed: allNames };
  }
  return { failed };
}
