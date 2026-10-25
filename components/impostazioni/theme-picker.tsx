"use client";

import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/lib/theme";
import {
  THEME_CHANGE_EVENT,
  getThemePreference,
  setThemePreference,
} from "@/lib/theme-preference";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: "auto",
    label: "Automatico",
    description: "Chiaro o scuro come il telefono o il computer.",
    icon: Monitor,
  },
  { value: "light", label: "Chiaro", description: "Sempre il tema chiaro.", icon: Sun },
  { value: "dark", label: "Scuro", description: "Sempre il tema scuro.", icon: Moon },
];

/** Scelta del tema, salvata nel browser di questo dispositivo. */
export function ThemePicker() {
  const [pref, setPref] = useState<ThemePreference>("auto");

  useEffect(() => {
    const sync = () => setPref(getThemePreference());
    // Valore disponibile solo nel browser: lettura al montaggio.
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
      <header className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">Tema</h2>
        <p className="text-sm text-muted-foreground">
          La scelta vale per questo dispositivo.
        </p>
      </header>
      <div role="radiogroup" aria-label="Tema" className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          const selected = pref === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setThemePreference(o.value)}
              className={cn(
                "flex min-h-11 items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary bg-primary-soft"
                  : "border-border/60 hover:bg-muted",
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
              <span className="flex-1">
                <span className="block text-sm font-medium">{o.label}</span>
                <span className="block text-xs text-muted-foreground">{o.description}</span>
              </span>
              {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
