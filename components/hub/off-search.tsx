"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addOffFood, searchOpenFoodFacts, type OffProduct } from "@/app/(app)/hub/food-actions";

/**
 * Ricerca nel database libero Open Food Facts (nome o codice a barre).
 * Si cerca solo premendo "Cerca": il servizio chiede poche ricerche al minuto.
 */
export function OffSearch({ onAdded }: { onAdded?: (id: string) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OffProduct[] | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [adding, setAdding] = useState<string | null>(null);

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    startSearch(async () => {
      const res = await searchOpenFoodFacts(query);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setResults(res.products);
    });
  }

  async function add(p: OffProduct) {
    setAdding(p.code);
    const res = await addOffFood(p.code);
    setAdding(null);
    if (!res.ok) return void toast.error(res.message);
    toast.success("Aggiunto ai tuoi alimenti", { description: p.nome });
    onAdded?.(res.id);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
      <form onSubmit={search} className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Cerca su Open Food Facts</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca un prodotto o scrivi il codice a barre"
            maxLength={80}
            className="h-9 w-full rounded-lg border border-input bg-transparent pl-8 pr-3 text-sm max-md:min-h-11 max-md:text-base"
          />
        </label>
        <Button type="submit" disabled={isSearching} className="max-md:min-h-11">
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cerca"}
        </Button>
      </form>
      {results && (
        results.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nessun prodotto trovato con i valori nutrizionali. Puoi aggiungerlo a mano.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border">
            {results.map((p) => (
              <li key={p.code} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[p.marca, `${p.kcal} kcal`, `P ${p.proteine} g`, `C ${p.carboidrati} g`, `G ${p.grassi} g`].filter(Boolean).join(" · ")} per 100 g
                  </p>
                </div>
                <Button size="sm" variant="outline" disabled={adding !== null} onClick={() => add(p)} className="max-md:min-h-11">
                  {adding === p.code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  <span className="sr-only sm:not-sr-only sm:ml-1">Aggiungi</span>
                </Button>
              </li>
            ))}
          </ul>
        )
      )}
      <p className="text-[11px] text-muted-foreground">
        Dati da{" "}
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="underline">
          Open Food Facts
        </a>{" "}
        (© Open Food Facts contributors, licenza ODbL). Controlla sempre i valori sull&apos;etichetta.
      </p>
    </div>
  );
}
