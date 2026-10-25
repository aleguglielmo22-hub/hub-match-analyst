"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { THEME_STORAGE_KEY, type ResolvedTheme } from "@/lib/theme";
import {
  THEME_CHANGE_EVENT,
  applyTheme,
  getThemePreference,
} from "@/lib/theme-preference";

/**
 * Mantiene il tema allineato dopo il primo disegno (lo script nell'<head>
 * l'ha già applicato): segue il cambio chiaro/scuro del dispositivo quando la
 * scelta è "Automatico", le modifiche da Impostazioni e da altre schede.
 * Fa anche seguire il tema alle notifiche.
 */
export function ThemeSync() {
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const sync = () => setResolved(applyTheme(getThemePreference()));
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === THEME_STORAGE_KEY) sync();
    };
    media.addEventListener("change", sync);
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return <Toaster position="top-right" richColors theme={resolved} />;
}
