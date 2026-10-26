"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Combine, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/archivio/combobox";
import { cn } from "@/lib/utils";
import {
  mergeLookups,
  renameLookup,
  type LookupKind,
  type LookupUsage,
  type LookupsWithUsage,
} from "@/app/(app)/impostazioni/anagrafiche/actions";

const KINDS: { key: LookupKind; label: string; singular: string }[] = [
  { key: "team", label: "Squadre", singular: "squadra" },
  { key: "competition", label: "Competizioni", singular: "competizione" },
  { key: "season", label: "Stagioni", singular: "stagione" },
];

const total = (u: LookupUsage) => u.cloud + u.set_pieces + u.osservazioni;

function usageParts(u: Pick<LookupUsage, "cloud" | "set_pieces" | "osservazioni">): string {
  const parts = [
    u.cloud && `${u.cloud} nel Cloud`,
    u.set_pieces && `${u.set_pieces} ${u.set_pieces === 1 ? "piazzato" : "piazzati"}`,
    u.osservazioni && `${u.osservazioni} ${u.osservazioni === 1 ? "osservazione" : "osservazioni"}`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "nessun utilizzo";
}

/** Elenco anagrafiche con utilizzi, Rinomina e Unisci. */
export function LookupsManager({ data }: { data: LookupsWithUsage }) {
  const [kind, setKind] = useState<LookupKind>("team");
  const [merging, setMerging] = useState<LookupUsage | null>(null);
  const items = data[kind];
  const kindMeta = KINDS.find((k) => k.key === kind)!;

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2" aria-label="Tipo di anagrafica">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => setKind(k.key)}
            aria-pressed={kind === k.key}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition-colors max-md:min-h-11",
              kind === k.key
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {k.label} ({data[k.key].length})
          </button>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          Nessuna {kindMeta.singular}: si creano al volo dai form.
        </p>
      ) : (
        <ul className="divide-y divide-border/50 rounded-xl border border-border/60 bg-card/40">
          {items.map((item) => (
            <LookupRow
              key={item.id}
              kind={kind}
              item={item}
              canMerge={items.length > 1}
              onMerge={() => setMerging(item)}
            />
          ))}
        </ul>
      )}

      <MergeDialog
        kind={kind}
        source={merging}
        options={items}
        onClose={() => setMerging(null)}
      />
    </div>
  );
}

function LookupRow({
  kind,
  item,
  canMerge,
  onMerge,
}: {
  kind: LookupKind;
  item: LookupUsage;
  canMerge: boolean;
  onMerge: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.label);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    const next = name.trim();
    if (!next || next === item.label) {
      setEditing(false);
      setName(item.label);
      return;
    }
    startTransition(async () => {
      try {
        await renameLookup(kind, item.id, next);
        toast.success("Rinominata", { description: `${item.label} → ${next}` });
        setEditing(false);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error("Rinomina non riuscita", { description: message });
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setEditing(false);
                setName(item.label);
              }
            }}
            autoFocus
            aria-label="Nuovo nome"
            className="h-9 max-md:h-11"
          />
        ) : (
          <>
            <p className="truncate text-sm font-medium">{item.label}</p>
            <p className="text-[11px] text-muted-foreground">
              {total(item)} {total(item) === 1 ? "utilizzo" : "utilizzi"}
              {total(item) > 0 && ` · ${usageParts(item)}`}
            </p>
          </>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        {editing ? (
          <>
            <Button type="button" size="sm" onClick={save} disabled={isPending} className="max-md:min-h-11">
              {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
              Salva
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                setEditing(false);
                setName(item.label);
              }}
              aria-label="Annulla"
              className="max-md:min-h-11"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)} className="max-md:min-h-11">
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Rinomina
            </Button>
            {canMerge && (
              <Button type="button" size="sm" variant="outline" onClick={onMerge} className="max-md:min-h-11">
                <Combine className="mr-1.5 h-3.5 w-3.5" />
                Unisci
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function MergeDialog({
  kind,
  source,
  options,
  onClose,
}: {
  kind: LookupKind;
  source: LookupUsage | null;
  options: LookupUsage[];
  onClose: () => void;
}) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const target = options.find((o) => o.id === targetId) ?? null;
  const singular = KINDS.find((k) => k.key === kind)!.singular;

  function close() {
    if (isPending) return;
    setTargetId(null);
    onClose();
  }

  function confirm() {
    if (!source || !target) return;
    startTransition(async () => {
      try {
        const moved = await mergeLookups(kind, source.id, target.id);
        toast.success(`«${source.label}» unita in «${target.label}»`, {
          description: `Spostati: ${usageParts(moved)}.`,
        });
        setTargetId(null);
        onClose();
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error("Unione non riuscita", { description: message });
      }
    });
  }

  return (
    <Dialog open={!!source} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unisci «{source?.label}»</DialogTitle>
          <DialogDescription>
            Tutti i riferimenti passano alla {singular} che resta, poi «{source?.label}» viene
            eliminata. Le date di modifica degli elementi non cambiano.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Unisci dentro</Label>
          <Combobox
            value={targetId}
            onChange={setTargetId}
            options={options.filter((o) => o.id !== source?.id)}
            placeholder={`Scegli la ${singular} che resta…`}
          />
        </div>

        {source && target && (
          <p className="rounded-lg border border-tone-warning/40 bg-tone-warning-soft px-3 py-2 text-xs text-tone-warning-fg">
            Verranno spostati <strong>{total(source)}</strong>{" "}
            {total(source) === 1 ? "riferimento" : "riferimenti"} ({usageParts(source)}) da «
            {source.label}» a «{target.label}». Poi «{source.label}» verrà eliminata.
            L&apos;operazione non si può annullare.
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={isPending}>
            Annulla
          </Button>
          <Button onClick={confirm} disabled={!target || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Combine className="mr-2 h-4 w-4" />}
            Unisci
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
