import { useId, useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import type { Lookup } from "@shared/api";
import { findByName } from "@workspace-lib/lookups/names";
import { cn } from "../lib/api";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Scelta da un'anagrafica condivisa (squadre, competizioni, stagioni) con
 * ricerca e creazione al volo. Stessa regola di AG Workspace: maiuscole e
 * spazi non contano, un nome già presente viene scelto invece di duplicarlo.
 */
export function LookupPicker({
  value,
  options,
  onChange,
  onCreate,
  placeholder,
  ariaLabel,
}: {
  value: string | null;
  options: Lookup[];
  onChange: (id: string | null) => void;
  onCreate: (name: string) => Promise<Lookup>;
  placeholder: string;
  ariaLabel: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const selected = options.find((o) => o.id === value) ?? null;

  const results = useMemo(() => {
    const q = fold(query);
    return (q ? options.filter((o) => fold(o.label).includes(q)) : options).slice(0, 50);
  }, [options, query]);
  const exact = query.trim() ? findByName(options, query) : undefined;
  const canCreate = query.trim().length > 0 && !exact;
  const total = results.length + (canCreate ? 1 : 0);

  async function choose(index: number) {
    if (index < results.length) {
      onChange(results[index].id);
    } else if (canCreate) {
      setCreating(true);
      try {
        const created = await onCreate(query.trim());
        onChange(created.id);
      } finally {
        setCreating(false);
      }
    }
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="flex h-9 items-center rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
        <input
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listId}
          value={open ? query : (selected?.label ?? "")}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(total - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && open && total > 0) {
              e.preventDefault();
              void choose(active);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        {selected && !open && (
          <button
            type="button"
            aria-label={`Togli ${selected.label}`}
            onClick={() => onChange(null)}
            className="mr-1 rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && total > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-xl"
        >
          {results.map((o, i) => (
            <li key={o.id} role="option" aria-selected={o.id === value}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void choose(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm",
                  i === active && "bg-muted",
                )}
              >
                <Check className={cn("h-3.5 w-3.5", o.id === value ? "text-primary-text" : "opacity-0")} />
                {o.label}
              </button>
            </li>
          ))}
          {canCreate && (
            <li role="option" aria-selected={false}>
              <button
                type="button"
                disabled={creating}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void choose(results.length)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-primary-text",
                  active === results.length && "bg-muted",
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                Crea «{query.trim()}»
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
