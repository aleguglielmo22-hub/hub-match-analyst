"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LookupOption } from "@/app/(app)/archivio/actions";

type Props = {
  value: string[]; // tag IDs
  onChange: (next: string[]) => void;
  options: LookupOption[];
  onCreate: (label: string) => Promise<LookupOption>;
  onCreated?: (option: LookupOption) => void;
};

export function TagInput({
  value,
  onChange,
  options,
  onCreate,
  onCreated,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => options.filter((o) => value.includes(o.id)),
    [options, value],
  );

  const trimmed = query.trim();
  const matches = useMemo(() => {
    if (!trimmed) return options.filter((o) => !value.includes(o.id)).slice(0, 8);
    return options
      .filter(
        (o) =>
          !value.includes(o.id) &&
          o.label.toLowerCase().includes(trimmed.toLowerCase()),
      )
      .slice(0, 8);
  }, [options, value, trimmed]);

  const exactMatch = trimmed
    ? options.find((o) => o.label.toLowerCase() === trimmed.toLowerCase())
    : null;
  const canCreate = trimmed.length > 0 && !exactMatch;

  function addTag(id: string) {
    if (!value.includes(id)) onChange([...value, id]);
    setQuery("");
    inputRef.current?.focus();
  }

  function removeTag(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  function handleCreate() {
    if (!trimmed) return;
    startTransition(async () => {
      try {
        const created = await onCreate(trimmed);
        onCreated?.(created);
        addTag(created.id);
      } catch (e) {
        console.error(e);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (exactMatch) addTag(exactMatch.id);
      else if (matches[0]) addTag(matches[0].id);
      else if (canCreate) handleCreate();
    } else if (e.key === "Backspace" && !query && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 transition-colors",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
        )}
      >
        {selected.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
          >
            #{tag.label}
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              aria-label={`Rimuovi tag ${tag.label}`}
              className="rounded-sm hover:bg-primary/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? "Aggiungi tag…" : ""}
          className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && (matches.length > 0 || canCreate) && (
        <div className="rounded-lg border border-border bg-popover shadow-md">
          <ul className="max-h-56 overflow-y-auto p-1">
            {matches.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(opt.id)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span className="truncate">#{opt.label}</span>
                </button>
              </li>
            ))}
            {canCreate && (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleCreate}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-primary/10 disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Crea tag <strong>“{trimmed}”</strong>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
