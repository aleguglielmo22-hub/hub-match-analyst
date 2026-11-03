import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Moduli condivisi con AG Workspace (lista degli ammessi, nomi delle anagrafiche).
const workspaceLib = resolve(__dirname, "../../lib");

export default defineConfig({
  main: {
    resolve: { alias: { "@shared": resolve(__dirname, "src/shared"), "@workspace-lib": workspaceLib } },
  },
  preload: {
    // Preload in sandbox: un unico file senza dipendenze esterne.
    build: { externalizeDeps: false, isolatedEntries: true },
    resolve: { alias: { "@shared": resolve(__dirname, "src/shared") } },
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve(__dirname, "src/renderer/src"),
        "@shared": resolve(__dirname, "src/shared"),
        "@workspace-lib": workspaceLib,
      },
    },
    plugins: [react(), tailwindcss()],
  },
});
