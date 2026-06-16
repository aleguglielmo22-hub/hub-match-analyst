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
 */
export async function uploadPendingAttachments(
  entityType: AttachmentEntity,
  entityId: string,
  files: File[],
): Promise<void> {
  if (files.length === 0) return;
  const workspaceId = await getAttachmentWorkspaceId();
  if (!workspaceId) throw new Error("Workspace non trovato");

  const supabase = createClient();
  const records = await Promise.all(
    files.map(async (file) => {
      const fileId = crypto.randomUUID();
      const path = `${workspaceId}/${entityType}/${entityId}/${fileId}-${slugifyFilename(file.name)}`;
      const { error } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type || undefined,
          upsert: false,
        });
      if (error) {
        throw new Error(`Upload "${file.name}" fallito: ${error.message}`);
      }
      return {
        file_name: file.name,
        file_path: path,
        file_size_bytes: file.size,
        mime_type: file.type || null,
      };
    }),
  );

  await saveAttachments(entityType, entityId, records);
}
