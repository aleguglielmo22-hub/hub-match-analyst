"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { duplicateItem } from "@/app/(app)/hub/actions";

/** Duplica l'elemento con le sue sotto-voci: è il modo per usarlo come modello. */
export function DuplicateButton({ collectionKey, id }: { collectionKey: string; id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await duplicateItem(collectionKey, id);
          if (!res.ok) {
            toast.error(res.message);
            return;
          }
          toast.success("Copia creata", { description: "Ora puoi modificarla." });
          if (res.href) router.push(res.href);
          router.refresh();
        })
      }
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted disabled:opacity-60 max-md:min-h-11"
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
      Duplica
    </button>
  );
}
