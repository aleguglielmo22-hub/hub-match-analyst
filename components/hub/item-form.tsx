"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save, Star, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FieldDef, FormValues, Option } from "@/lib/hub/fields";
import { COLLECTIONS, isCollectionKey } from "@/lib/hub/registry";
import { saveItem, type SaveResult } from "@/app/(app)/hub/actions";

type Values = FormValues;

const inputCls =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive max-md:min-h-11 max-md:text-base dark:bg-input/30";

function FieldInput({
  f,
  value,
  onChange,
  error,
  options,
}: {
  f: FieldDef;
  value: string | boolean | string[];
  onChange: (v: string | boolean | string[]) => void;
  error?: string;
  options?: Option[];
}) {
  const id = `f-${f.key}`;
  const common = { id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${id}-err` : f.help ? `${id}-help` : undefined };

  let control: React.ReactNode;
  switch (f.type) {
    case "longtext":
      control = (
        <textarea
          {...common}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          rows={f.key === "contenuto" ? 12 : 4}
          maxLength={f.max ?? 20000}
          placeholder={f.placeholder}
          className={cn(inputCls, "h-auto py-2")}
        />
      );
      break;
    case "select":
      control = (
        <select {...common} value={String(value)} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "bg-background")}>
          {!f.required && <option value="">—</option>}
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case "ref":
      control = (
        <select {...common} value={String(value)} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "bg-background")}>
          <option value="">{f.required ? "Scegli…" : "—"}</option>
          {(options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case "boolean":
      return (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
          {f.label}
        </label>
      );
    case "rating": {
      const n = Number(value) || 0;
      control = (
        <div className="flex items-center gap-1" role="radiogroup" aria-label={f.label}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={n === i}
              aria-label={`${i} su 5`}
              onClick={() => onChange(String(i))}
              className="grid h-9 w-9 place-items-center rounded-md hover:bg-muted max-md:h-11 max-md:w-11"
            >
              <Star className={cn("h-5 w-5", i <= n ? "fill-primary text-primary" : "text-muted-foreground")} />
            </button>
          ))}
          {n > 0 && (
            <button type="button" onClick={() => onChange("")} className="ml-1 text-xs text-muted-foreground hover:text-foreground">
              Togli
            </button>
          )}
        </div>
      );
      break;
    }
    case "tags":
      control = (
        <input
          {...common}
          value={Array.isArray(value) ? value.join(", ") : String(value)}
          onChange={(e) => onChange(e.target.value.split(","))}
          placeholder="Separati da virgola, es. tattica, esame"
          className={inputCls}
        />
      );
      break;
    default:
      control = (
        <div className="relative">
          <input
            {...common}
            type={f.type === "date" ? "date" : f.type === "url" ? "url" : "text"}
            inputMode={["number", "integer", "money"].includes(f.type) ? "decimal" : undefined}
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            placeholder={f.placeholder ?? (f.type === "url" ? "https://…" : f.type === "money" ? "0,00" : undefined)}
            maxLength={f.type === "text" ? (f.max ?? 300) : undefined}
            className={cn(inputCls, (f.unit || f.type === "money") && "pr-12")}
          />
          {(f.unit || f.type === "money") && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {f.type === "money" ? "€" : f.unit}
            </span>
          )}
        </div>
      );
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {f.label}
        {f.required && <span className="text-destructive"> *</span>}
      </label>
      {control}
      {f.help && !error && (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {f.help}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Modulo di una sezione personale: i campi vengono dal registro.
 * In pagina porta al dettaglio; in una finestra (`onDone`) la chiude.
 */
export function ItemForm({
  collectionKey,
  id,
  initial,
  refOptions,
  parent,
  cancelHref,
  onDone,
  onCancel,
}: {
  collectionKey: string;
  id: string | null;
  initial: Values;
  refOptions: Record<string, Option[]>;
  parent?: { collection: string; field: string; id: string };
  cancelHref?: string;
  onDone?: (r: Extract<SaveResult, { ok: true }>) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const c = isCollectionKey(collectionKey) ? COLLECTIONS[collectionKey] : null;
  if (!c) return null;
  const fields = c.fields.filter((f) => !f.readOnly);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveItem(collectionKey, id, values, parent);
      if (!res.ok) {
        setErrors(res.errors ?? {});
        toast.error(res.message);
        return;
      }
      setErrors({});
      toast.success(id ? "Modifiche salvate" : "Salvato");
      if (onDone) {
        onDone(res);
        router.refresh();
      } else if (res.href) {
        router.push(res.href);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={cn((f.wide || f.type === "longtext") && "sm:col-span-2")}>
            <FieldInput
              f={f}
              value={values[f.key] ?? ""}
              onChange={(v) => setValues((p) => ({ ...p, [f.key]: v }))}
              error={errors[f.key]}
              options={f.ref ? refOptions[f.ref] : undefined}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            <X className="mr-1.5 h-4 w-4" /> Annulla
          </Button>
        ) : cancelHref ? (
          <Link href={cancelHref} className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-muted-foreground hover:text-foreground max-md:min-h-11">
            Annulla
          </Link>
        ) : null}
        <Button type="submit" disabled={isPending} className="max-md:min-h-11">
          {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          Salva
        </Button>
      </div>
    </form>
  );
}
