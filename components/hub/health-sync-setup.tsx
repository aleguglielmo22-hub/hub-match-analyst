"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createSyncToken, revokeSyncToken } from "@/app/(app)/hub/health-sync-actions";

function CopyField({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-muted/50 px-3 py-2 text-xs">{value}</code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="max-md:min-h-11"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setDone(true);
              setTimeout(() => setDone(false), 2000);
            } catch {
              toast.error("Copia non riuscita: selezionalo e copialo a mano.");
            }
          }}
        >
          {done ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
          {done ? "Copiato" : "Copia"}
        </Button>
      </div>
    </div>
  );
}

/** Genera la chiave di sincronizzazione e mostra come collegare l'iPhone. */
export function HealthSyncSetup({ configured, lastSync }: { configured: boolean; lastSync: string | null }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/api/health-sync`;

  function generate() {
    startTransition(async () => {
      const res = await createSyncToken();
      if (!res.ok) return void toast.error(res.message);
      setToken(res.token);
      router.refresh();
    });
  }

  function revoke() {
    startTransition(async () => {
      const res = await revokeSyncToken();
      if (!res.ok) return void toast.error("Non è stato possibile disattivare la sincronizzazione.");
      setToken(null);
      toast.success("Sincronizzazione disattivata");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
        <p className="text-sm">
          Stato:{" "}
          <strong>{configured ? (lastSync ? `attiva · ultimo invio ${lastSync}` : "chiave creata · nessun dato ricevuto ancora") : "non attiva"}</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={generate} disabled={isPending} className="max-md:min-h-11">
            {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <KeyRound className="mr-1.5 h-4 w-4" />}
            {configured ? "Crea una nuova chiave" : "Attiva la sincronizzazione"}
          </Button>
          {configured && (
            <Button variant="ghost" onClick={revoke} disabled={isPending} className="text-destructive max-md:min-h-11">
              <Trash2 className="mr-1.5 h-4 w-4" /> Disattiva
            </Button>
          )}
        </div>
        {configured && !token && <p className="text-xs text-muted-foreground">Una nuova chiave annulla quella vecchia: dovrai aggiornarla nell&apos;app dell&apos;iPhone.</p>}
      </div>

      {token && (
        <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm font-semibold">Copia questi due dati ora: la chiave non si vede più dopo.</p>
          <CopyField label="Indirizzo" value={url} />
          <CopyField label="Chiave (da scrivere dopo la parola Bearer)" value={token} />
          <CopyField label="Intestazione completa (Authorization)" value={`Bearer ${token}`} />
        </div>
      )}

      <section className="space-y-2 rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold">Come collegare l&apos;iPhone (una volta sola)</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>
            Installa <strong className="text-foreground">Health Auto Export - JSON+CSV</strong> dall&apos;App Store (l&apos;invio automatico ad un indirizzo è una funzione a pagamento dell&apos;app).
          </li>
          <li>
            Nell&apos;app: <strong className="text-foreground">Export → Automated → New Automation</strong>, tipo <strong className="text-foreground">REST API</strong>.
          </li>
          <li>
            Incolla l&apos;<strong className="text-foreground">indirizzo</strong> qui sopra. In <em>HTTP Headers</em> aggiungi: chiave <code>Authorization</code>, valore <code>Bearer</code> + la chiave.
          </li>
          <li>
            Data Type: <strong className="text-foreground">Health Metrics</strong>. Scegli: Weight &amp; Body Mass, Resting Heart Rate, Step Count, Active Energy, Sleep Analysis, Body Fat Percentage, Blood Oxygen Saturation, Heart Rate Variability, Blood Pressure.
          </li>
          <li>
            Formato <strong className="text-foreground">JSON</strong>, versione 2, <strong className="text-foreground">Summarize Data attivo</strong>, raggruppamento <strong className="text-foreground">giorni</strong>, periodo &quot;Previous 7 Days&quot;, frequenza ogni giorno. Attiva <em>Enabled</em> e salva.
          </li>
          <li>
            Per caricare anche lo storico: <strong className="text-foreground">Manual Upload</strong> nella stessa automazione, con le date di inizio e fine.
          </li>
        </ol>
        <p className="text-xs text-muted-foreground">
          Zepp: attiva in Zepp la sincronizzazione con Apple Salute (Profilo → Account → Salute); poi i dati passano da lì. L&apos;iPhone deve essere sbloccato quando l&apos;app legge i dati e iOS può ritardare gli invii, quindi il sistema non garantisce l&apos;orario preciso. I valori scritti a mano non vengono mai sovrascritti.
        </p>
      </section>
    </div>
  );
}
