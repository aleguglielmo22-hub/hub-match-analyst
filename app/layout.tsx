import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/app/service-worker-register";
import { THEME_BAR_HEX } from "@/lib/theme";

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
  themeColor: THEME_BAR_HEX,
  // Necessario per leggere le aree sicure dell'iPhone (safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`dark ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <ServiceWorkerRegister />
        <Toaster position="top-right" richColors theme="dark" />
      </body>
    </html>
  );
}
