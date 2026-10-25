/**
 * Tema dell'interfaccia: chiaro B "Navy club" (predefinito) e scuro C "Notte blu"
 * (app/globals.css). Colori in esadecimale per manifest e theme-color, che non
 * leggono le variabili CSS: da aggiornare insieme alla palette.
 */
export const THEME = {
  light: { background: "#F4F6FA", bar: "#0B2149" },
  dark: { background: "#0B1220", bar: "#121C2E" },
} as const;

export type ThemePreference = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/** Chiave nel browser (localStorage) della scelta Automatico / Chiaro / Scuro. */
export const THEME_STORAGE_KEY = "ag-theme";

/**
 * Script eseguito nell'<head> prima che la pagina venga disegnata: applica il
 * tema salvato (o quello del dispositivo) senza lampeggio del tema sbagliato.
 * Deve restare autonomo: niente import, niente variabili esterne a runtime.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(p!=="light"&&p!=="dark")p="auto";var d=p==="dark"||(p==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
