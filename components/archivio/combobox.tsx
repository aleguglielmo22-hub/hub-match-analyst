"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
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

type ComboboxProps = {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  options: LookupOption[];
  /** Callback se l'utente vuole creare una nuova opzione inline. */
  onCreate?: (label: string) => Promise<LookupOption>;
  /** Append della nuova opzione alle options esistenti, gestito dal genitore. */
  onCreated?: (option: LookupOption) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
};

export function Combobox({
  value,
  onChange,
  options,
  onCreate,
  onCreated,
  placeholder = "Seleziona…",
  emptyLabel = "Nessun risultato",
  disabled,
}: ComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Reset query quando il popover si chiude
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const selected = useMemo(
    () => options.find((o) => o.id === value),
    [options, value],
  );

  const trimmed = query.trim();
  const exactMatch = trimmed
    ? options.find((o) => o.label.toLowerCase() === trimmed.toLowerCase())
    : null;
  const showCreate = !!onCreate && trimmed.length > 0 && !exactMatch;

  function handleCreate() {
    if (!onCreate || !trimmed) return;
    startTransition(async () => {
      try {
        const created = await onCreate(trimmed);
        onCreated?.(created);
        onChange(created.id);
        setOpen(false);
      } catch (e) {
        // L'errore arriva al form parent via toast. Qui silenziamo.
        console.error(e);
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-left text-sm transition-colors",
          "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground",
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <div className="flex items-center gap-1.5 pl-2">
          {selected && (
            <span
              role="button"
              aria-label="Pulisci selezione"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-[16rem] p-0"
      >
        <Command>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Cerca o crea…"
          />
          <CommandList>
            <CommandEmpty>
              {showCreate ? null : emptyLabel}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5",
                      value === opt.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {showCreate && (
              <CommandGroup heading="Crea nuovo">
                <CommandItem
                  value={`__create__${trimmed}`}
                  onSelect={handleCreate}
                  disabled={isPending}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  <span className="truncate">
                    Crea <strong>“{trimmed}”</strong>
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
