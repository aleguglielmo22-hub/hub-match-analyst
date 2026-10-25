"use client";

import {
  THEME,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

/** Evento interno: la scelta del tema è cambiata in questa scheda. */
export const THEME_CHANGE_EVENT = "ag-theme-change";

export function getThemePreference(): ThemePreference {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    if (pref === "auto") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Storage non disponibile: il tema vale solo per questa visita.
  }
  applyTheme(pref);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref !== "auto") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Applica il tema: classe "dark" su <html>, color-scheme e colore della barra
 * del telefono (theme-color). Con "Automatico" il theme-color segue il dispositivo
 * tramite i meta con media query; con una scelta manuale li forza entrambi.
 */
export function applyTheme(pref: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    const media = meta.getAttribute("media") ?? "";
    const natural = media.includes("dark") ? THEME.dark.bar : THEME.light.bar;
    meta.setAttribute("content", pref === "auto" ? natural : THEME[resolved].bar);
  });
  return resolved;
}
