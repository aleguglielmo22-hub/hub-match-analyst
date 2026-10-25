import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/app/service-worker-register";
import { ThemeSync } from "@/components/app/theme-sync";
import { THEME, THEME_INIT_SCRIPT } from "@/lib/theme";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AG Workspace",
  description: "Scouting, palle inattive, training e cloud per il match analyst",
  // App installata su iPhone: a schermo intero, titolo breve, barra di stato scura.
  appleWebApp: {
    capable: true,
    title: "AG",
    statusBarStyle: "black",
  },
  // Next genera solo "mobile-web-app-capable": questo serve agli iOS meno recenti.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  // Colore della barra del telefono per ciascun tema (una scelta manuale
  // in Impostazioni → Aspetto li sovrascrive: vedi lib/theme-preference.ts).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME.light.bar },
    { media: "(prefers-color-scheme: dark)", color: THEME.dark.bar },
  ],
  // Necessario per leggere le aree sicure dell'iPhone (safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // La classe "dark" la decide lo script qui sotto prima del primo disegno.
    <html
      lang="it"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <ServiceWorkerRegister />
        <ThemeSync />
      </body>
    </html>
  );
}
