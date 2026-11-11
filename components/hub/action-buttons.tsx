"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { registerRecurring, startSessionFromTemplate } from "@/app/(app)/hub/actions";

/** Crea l'allenamento di oggi dalla scheda, con tutte le serie già pronte. */
export function StartSessionButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      disabled={isPending}
      className="max-md:min-h-11"
      onClick={() =>
        startTransition(async () => {
          const res = await startSessionFromTemplate(templateId);
          if (!res.ok) return void toast.error(res.message);
          toast.success("Allenamento creato", { description: "Aggiorna ripetizioni e carichi man mano." });
          if (res.href) router.push(res.href);
        })
      }
    >
      {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
      Inizia allenamento di oggi
    </Button>
  );
}

/** Registra il movimento della scadenza e sposta la data alla prossima. */
export function RegisterRecurringButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={isPending}
      className="max-md:min-h-11"
      onClick={() =>
        startTransition(async () => {
          const res = await registerRecurring(id);
          if (!res.ok) return void toast.error(res.message);
          toast.success("Movimento registrato", { description: "La prossima scadenza è stata aggiornata." });
          router.refresh();
        })
      }
    >
      {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Receipt className="mr-1.5 h-4 w-4" />}
      Registra il pagamento
    </Button>
  );
}
