"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Crown, UserCheck, Hourglass, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  revokeMember,
  type MemberRow,
} from "@/app/(app)/impostazioni/collaboratori/actions";
import { cn } from "@/lib/utils";

function statusBadge(status: MemberRow["status"]) {
  if (status === "ACTIVE") {
    return (
      <Badge variant="secondary" className="text-[10px]">
        <UserCheck className="mr-1 h-3 w-3" />
        Attivo
      </Badge>
    );
  }
  if (status === "PENDING") {
    return (
      <Badge variant="outline" className="text-[10px]">
        <Hourglass className="mr-1 h-3 w-3" />
        In attesa
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] text-destructive">
      Revocato
    </Badge>
  );
}

function MemberRowItem({
  member,
  onRevoked,
}: {
  member: MemberRow;
  onRevoked: (id: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canRevoke = member.role === "COLLABORATOR" && !member.is_self;

  function handleRevoke() {
    startTransition(async () => {
      try {
        await revokeMember(member.id);
        toast.success("Collaboratore revocato");
        setConfirmOpen(false);
        onRevoked(member.id);
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error("Revoca fallita", { description: message });
      }
    });
  }

  const dateLabel =
    member.status === "ACTIVE" && member.accepted_at
      ? `Entrato ${format(parseISO(member.accepted_at), "d MMM yyyy", { locale: it })}`
      : `Invitato ${format(parseISO(member.invited_at), "d MMM yyyy", { locale: it })}`;

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/30 p-3">
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ring-1",
          member.role === "OWNER"
            ? "bg-primary/15 text-primary ring-primary/30"
            : "bg-muted text-foreground/70 ring-border/60",
        )}
      >
        {member.role === "OWNER" ? (
          <Crown className="h-4 w-4" />
        ) : (
          member.email.charAt(0).toUpperCase()
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={member.email}>
          {member.email}
          {member.is_self && (
            <span className="ml-1 text-xs text-muted-foreground">(tu)</span>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground">{dateLabel}</p>
      </div>
      <div className="flex items-center gap-2">
        {member.role === "OWNER" ? (
          <Badge variant="secondary" className="text-[10px]">
            <Crown className="mr-1 h-3 w-3" />
            Proprietario
          </Badge>
        ) : (
          statusBadge(member.status)
        )}
        {canRevoke && (
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Revoca ${member.email}`}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Revocare l&apos;accesso?</DialogTitle>
                <DialogDescription>
                  <strong>{member.email}</strong> non potrà più vedere
                  l&apos;archivio del workspace. Le voci che ha creato restano,
                  ma non potrà più modificarle.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmOpen(false)}
                  disabled={isPending}
                >
                  Annulla
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRevoke}
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Revoca…
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Sì, revoca
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </li>
  );
}

export function MembersList({ members }: { members: MemberRow[] }) {
  const [items, setItems] = useState<MemberRow[]>(members);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessun collaboratore ancora invitato.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((m) => (
        <MemberRowItem
          key={m.id}
          member={m}
          onRevoked={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
        />
      ))}
    </ul>
  );
}
