"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { LookupOption } from "@/app/(app)/archivio/actions";

type Props = {
  label: string;
  options: LookupOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

/**
 * Multi-select per opzioni con label (es. teams/competitions/seasons/tags).
 * Trigger compatto con conteggio; popover con ricerca e checkboxes.
 */
export function MultiSelectPopover({
  label,
  options,
  value,
  onChange,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.filter((o) => value.includes(o.id)),
    [options, value],
  );

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-sidebar-foreground/80">
          {label}
        </span>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Pulisci
          </button>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-2.5 text-left text-xs transition-colors",
            "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
            value.length === 0 && "text-muted-foreground",
          )}
        >
          <span className="truncate">
            {value.length === 0
              ? (placeholder ?? "Tutti")
              : value.length === 1
                ? selected[0]?.label
                : `${value.length} selezionati`}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] min-w-[14rem] p-0"
        >
          <Command>
            <CommandInput placeholder="Cerca…" />
            <CommandList>
              <CommandEmpty>Nessun risultato</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const active = value.includes(opt.id);
                  return (
                    <CommandItem
                      key={opt.id}
                      value={opt.label}
                      onSelect={() => toggle(opt.id)}
                    >
                      <span
                        className={cn(
                          "mr-2 grid h-3.5 w-3.5 place-items-center rounded-sm border",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {active && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span className="truncate">{opt.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              {s.label}
              <button
                type="button"
                onClick={() => toggle(s.id)}
                aria-label={`Rimuovi ${s.label}`}
                className="rounded-sm hover:bg-primary/20"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Toggle chip group: per enum con pochi valori (ambito, categoria, ecc.).
 */
export function ToggleChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (next: T[]) => void;
}) {
  function toggle(v: T) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-sidebar-foreground/80">
          {label}
        </span>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Pulisci
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const active = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              aria-pressed={active}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border bg-transparent text-muted-foreground hover:border-border/80 hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
