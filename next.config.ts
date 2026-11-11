import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ottimizzazione immagini solo per i file del marchio (public/brand).
  images: {
    localPatterns: [{ pathname: "/brand/**", search: "" }],
  },
  // App a utente singolo: la vecchia pagina Collaboratori non esiste più.
  // Reindirizzamento temporaneo (307), così il browser non lo memorizza per sempre.
  async redirects() {
    return [
      { source: "/impostazioni", destination: "/impostazioni/preferenze", permanent: false },
      { source: "/impostazioni/collaboratori", destination: "/impostazioni/backup", permanent: false },
    ];
  },
  // Service worker sempre aggiornato (guida PWA di Next.js, §8).
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
