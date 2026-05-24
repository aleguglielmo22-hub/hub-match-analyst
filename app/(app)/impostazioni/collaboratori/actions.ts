"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";

export type MemberRow = {
  id: string;
  email: string;
  role: "OWNER" | "COLLABORATOR";
  status: "PENDING" | "ACTIVE" | "REVOKED";
  invited_at: string;
  accepted_at: string | null;
  /** True se questo membro è l'utente loggato (per nascondere il bottone revoca su sé stesso). */
  is_self: boolean;
};

export async function listMembers(): Promise<MemberRow[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("id, user_id, email_invitata, role, status, invited_at, accepted_at")
    .eq("workspace_id", workspace.id)
    .order("invited_at", { ascending: true });

  if (error || !data) return [];

  return data.map((m) => ({
    id: m.id,
    email: m.email_invitata,
    role: m.role,
    status: m.status,
    invited_at: m.invited_at,
    accepted_at: m.accepted_at,
    is_self: m.user_id === workspace.userId,
  }));
}

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email non valida")
  .max(200);

export async function inviteCollaborator(
  rawEmail: string,
): Promise<{ ok: true; alreadyInvited?: boolean }> {
  const email = emailSchema.parse(rawEmail);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");
  if (!workspace.isOwner)
    throw new Error("Solo il proprietario può invitare collaboratori");

  const supabase = await createClient();

  // Esiste già un invito per quella email?
  const { data: existing } = await supabase
    .from("workspace_members")
    .select("id, status")
    .eq("workspace_id", workspace.id)
    .eq("email_invitata", email)
    .maybeSingle();

  if (existing) {
    // Se era REVOKED, lo riattiviamo a PENDING.
    if (existing.status === "REVOKED") {
      const { error: upErr } = await supabase
        .from("workspace_members")
        .update({ status: "PENDING", invited_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (upErr) throw new Error(upErr.message);
      revalidatePath("/impostazioni/collaboratori");
      return { ok: true };
    }
    return { ok: true, alreadyInvited: true };
  }

  const { error } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    email_invitata: email,
    role: "COLLABORATOR",
    status: "PENDING",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/impostazioni/collaboratori");
  return { ok: true };
}

export async function revokeMember(
  memberId: string,
): Promise<{ ok: true }> {
  z.string().uuid().parse(memberId);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");
  if (!workspace.isOwner)
    throw new Error("Solo il proprietario può revocare i collaboratori");

  const supabase = await createClient();

  // Non si può revocare se stessi né un OWNER (di fatto qui c'è un solo OWNER per workspace).
  const { data: target } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("id", memberId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!target) throw new Error("Membro non trovato");
  if (target.role === "OWNER")
    throw new Error("Non puoi revocare il proprietario");
  if (target.user_id && target.user_id === workspace.userId)
    throw new Error("Non puoi revocare te stesso");

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId)
    .eq("workspace_id", workspace.id);

  if (error) throw new Error(error.message);

  revalidatePath("/impostazioni/collaboratori");
  return { ok: true };
}
