"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  TOP_COUNTRIES,
  findCountry,
  formatNationalities,
  parseNationalities,
  searchCountries,
} from "@/lib/geo/countries";

const MAX = 2;

/**
 * Nazionalità (fino a 2) scelte dall'elenco dei paesi in italiano, con ricerca
 * e i più usati in cima. Salvate come testo "Francia/Senegal", come prima.
 * Un testo già salvato che non è nell'elenco resta visibile e valido.
 */
export function NationalityPicker({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string | null;
  onChange: (next: string | null, list: string[]) => void;
}) {
  const [open, setOpenState] = useState(false);
  const [query, setQuery] = useState("");
  const list = parseNationalities(value);
  const setOpen = (next: boolean) => {
    setOpenState(next);
    if (!next) setQuery("");
  };

  const results = useMemo(() => searchCountries(query, parseNationalities(value)), [query, value]);
  const topCount = query.trim() ? 0 : TOP_COUNTRIES.filter((c) => !list.includes(c)).length;

  function update(next: string[]) {
    onChange(formatNationalities(next), next);
  }

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1.5 max-md:min-h-11">
      {list.map((n) => {
        const known = findCountry(n) !== null;
        return (
          <span
            key={n}
            title={known ? undefined : "Testo già salvato, non presente nell'elenco dei paesi"}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
              known ? "bg-primary/10 text-primary" : "bg-muted text-foreground/80 italic",
            )}
          >
            {n}
            <button
              type="button"
              onClick={() => update(list.filter((x) => x !== n))}
              aria-label={`Rimuovi ${n}`}
              className="relative rounded-sm hover:bg-primary/20 max-md:after:absolute max-md:after:-inset-3"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
      {list.length < MAX && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            id={id}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground max-md:min-h-9"
          >
            <Plus className="h-3.5 w-3.5" />
            {list.length === 0 ? "Scegli paese" : "Seconda nazionalità"}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <Command shouldFilter={false}>
              <CommandInput value={query} onValueChange={setQuery} placeholder="Cerca paese…" />
              <CommandList>
                <CommandEmpty>Nessun paese trovato</CommandEmpty>
                {topCount > 0 && (
                  <CommandGroup heading="Più usati">
                    {results.slice(0, topCount).map((c) => (
                      <CommandItem key={c} value={c} onSelect={() => { update([...list, c]); setOpen(false); }}>
                        {c}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandGroup heading={topCount > 0 ? "Tutti i paesi" : undefined}>
                  {results.slice(topCount).map((c) => (
                    <CommandItem key={c} value={c} onSelect={() => { update([...list, c]); setOpen(false); }}>
                      {c}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
