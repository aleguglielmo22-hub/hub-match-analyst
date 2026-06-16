"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import {
  ATTACHMENT_ENTITIES,
  ATTACHMENTS_BUCKET,
  type AttachmentEntity,
  type AttachmentItem,
  type NewAttachmentInput,
} from "@/lib/attachments/shared";

const entitySchema = z.enum(ATTACHMENT_ENTITIES);
const SIGNED_URL_TTL = 60 * 60; // 1h

/** Workspace id corrente — usato dal client per costruire il path di upload. */
export async function getAttachmentWorkspaceId(): Promise<string | null> {
  const workspace = await getCurrentWorkspace();
  return workspace?.id ?? null;
}

export async function listAttachments(
  entityType: AttachmentEntity,
  entityId: string,
): Promise<AttachmentItem[]> {
  entitySchema.parse(entityType);
  z.string().uuid().parse(entityId);

  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attachments")
    .select(
      "id, created_by, file_name, file_path, file_size_bytes, mime_type, created_at",
    )
    .eq("workspace_id", workspace.id)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("posizione", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const signed = await Promise.all(
    data.map(async (f) => {
      const { data: s } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .createSignedUrl(f.file_path, SIGNED_URL_TTL);
      return s?.signedUrl ?? null;
    }),
  );

  return data.map((f, i) => ({
    id: f.id,
    file_name: f.file_name,
    file_path: f.file_path,
    file_size_bytes: f.file_size_bytes,
    mime_type: f.mime_type,
    created_at: f.created_at,
    signed_url: signed[i],
    can_delete: workspace.isOwner || f.created_by === workspace.userId,
  }));
}

/** Inserisce i record degli allegati già caricati su storage. */
export async function saveAttachments(
  entityType: AttachmentEntity,
  entityId: string,
  files: NewAttachmentInput[],
): Promise<{ ok: true }> {
  entitySchema.parse(entityType);
  z.string().uuid().parse(entityId);
  if (files.length === 0) return { ok: true };

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();
  const { count } = await supabase
    .from("attachments")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  const base = count ?? 0;
  const { error } = await supabase.from("attachments").insert(
    files.map((f, i) => ({
      workspace_id: workspace.id,
      created_by: workspace.userId,
      entity_type: entityType,
      entity_id: entityId,
      file_name: f.file_name,
      file_path: f.file_path,
      file_size_bytes: f.file_size_bytes,
      mime_type: f.mime_type,
      posizione: base + i,
    })),
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteAttachment(id: string): Promise<{ ok: true }> {
  z.string().uuid().parse(id);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();
  const { data } = await supabase
    .from("attachments")
    .select("file_path")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (data?.file_path) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([data.file_path]);
  }
  // La RLS consente la DELETE solo a owner del workspace o creatore.
  const { error } = await supabase.from("attachments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
