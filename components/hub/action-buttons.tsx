"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Library, Loader2, Play, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { registerRecurring, startSessionFromTemplate } from "@/app/(app)/hub/actions";
import { seedExercises } from "@/app/(app)/hub/workout-actions";

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

/** Aggiunge al tuo elenco gli esercizi più comuni (quelli che hai già non si duplicano). */
export function SeedExercisesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/40 p-4">
      <p className="min-w-48 flex-1 text-sm text-muted-foreground">
        Parti da una libreria di circa 45 esercizi comuni, già divisi per gruppo muscolare. Per ognuno puoi poi aggiungere il link a un video.
      </p>
      <Button
        variant="outline"
        disabled={isPending}
        className="max-md:min-h-11"
        onClick={() =>
          startTransition(async () => {
            const res = await seedExercises();
            if (!res.ok) return void toast.error("Non è stato possibile aggiungere gli esercizi.");
            toast.success(res.added ? `${res.added} esercizi aggiunti` : "Hai già tutti gli esercizi della libreria");
            router.refresh();
          })
        }
      >
        {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Library className="mr-1.5 h-4 w-4" />}
        Aggiungi gli esercizi più comuni
      </Button>
    </div>
  );
}
