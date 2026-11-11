"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markReviewed } from "@/app/(app)/hub/actions";

export function ReviewButton({ collectionKey, id }: { collectionKey: string; id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      className="max-md:min-h-11"
      onClick={() =>
        startTransition(async () => {
          const res = await markReviewed(collectionKey, id);
          if (!res.ok) return void toast.error("Non è stato possibile segnare il ripasso.");
          toast.success("Ripasso segnato");
          router.refresh();
        })
      }
    >
      {isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
      Ripassato
    </Button>
  );
}
