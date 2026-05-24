"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteCollaborator } from "@/app/(app)/impostazioni/collaboratori/actions";

export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        const res = await inviteCollaborator(trimmed);
        if (res.alreadyInvited) {
          toast.info("Era già invitato", {
            description: `${trimmed} risulta già nella lista.`,
          });
        } else {
          toast.success("Invito creato", {
            description:
              "Quando l'invitato si registrerà con questa email, entrerà nel workspace.",
          });
          setEmail("");
        }
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error("Invito fallito", { description: message });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border/60 bg-card/40 p-5"
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="invite-email"
            className="text-sm font-semibold tracking-tight"
          >
            Invita per email
          </Label>
          <p className="text-xs text-muted-foreground">
            L&apos;invitato vedrà l&apos;archivio quando si registrerà via
            magic link con la stessa email.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="invite-email"
              type="email"
              required
              placeholder="nome@esempio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              className="h-9 pl-8 text-sm"
              autoComplete="off"
            />
          </div>
          <Button type="submit" disabled={isPending || !email.trim()}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Invio…
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
