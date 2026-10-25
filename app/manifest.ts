import type { MetadataRoute } from "next";
import { THEME_BACKGROUND_HEX, THEME_BAR_HEX } from "@/lib/theme";

/** Manifest PWA: rende l'app installabile sulla schermata Home. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AG Workspace",
    short_name: "AG",
    description: "Scouting, palle inattive, training e cloud per il match analyst",
    lang: "it",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: THEME_BACKGROUND_HEX,
    theme_color: THEME_BAR_HEX,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
