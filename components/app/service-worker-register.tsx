"use client";

import { useEffect } from "react";

/** Registra il service worker (solo in produzione): pagina offline, nessuna cache dei dati. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => console.error("[PWA] Registrazione service worker fallita:", err));
  }, []);
  return null;
}
