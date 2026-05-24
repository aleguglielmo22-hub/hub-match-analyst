"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Campo di ricerca testuale per la lista archivio.
 * Aggiorna ?q= nell'URL con debounce 300ms. Combinabile con i filtri sidebar.
 */
export function SearchInput({
  basePath,
  initialQuery,
}: {
  basePath: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const sp = new URLSearchParams(searchParams ?? undefined);
      if (value.trim()) sp.set("q", value.trim());
      else sp.delete("q");
      router.replace(`${basePath}?${sp.toString()}`, { scroll: false });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function clear() {
    setValue("");
    const sp = new URLSearchParams(searchParams ?? undefined);
    sp.delete("q");
    router.replace(`${basePath}?${sp.toString()}`, { scroll: false });
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cerca per titolo o descrizione…"
        className="h-9 pl-8 pr-8 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Pulisci ricerca"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
