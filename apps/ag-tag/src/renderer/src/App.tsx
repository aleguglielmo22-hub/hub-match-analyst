import { useCallback, useEffect, useState } from "react";
import { Film, Loader2, LogOut, Plus, Settings as SettingsIcon } from "lucide-react";
import type { Settings, UserInfo } from "@shared/api";
import { LogoMark } from "./components/Logo";
import { api, cn, errorMessage } from "./lib/api";
import { LoginPage } from "./pages/LoginPage";
import { MatchesPage } from "./pages/MatchesPage";
import { NewMatchPage } from "./pages/NewMatchPage";
import { PlayerPage } from "./pages/PlayerPage";
import { SettingsPage } from "./pages/SettingsPage";

export type View = { name: "list" } | { name: "new" } | { name: "player"; id: string } | { name: "settings" };

export function App() {
  const [user, setUser] = useState<UserInfo | null | undefined>(undefined);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [view, setView] = useState<View>({ name: "list" });

  useEffect(() => {
    api.settings.get().then(setSettings);
    api.auth
      .current()
      .then(setUser)
      .catch((err) => {
        setStartupError(errorMessage(err));
        setUser(null);
      });
  }, []);

  // Tema: Grafite predefinito, Carta a scelta.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", (settings?.theme ?? "dark") === "dark");
  }, [settings?.theme]);

  const signOut = useCallback(async () => {
    await api.auth.signOut();
    setUser(null);
    setView({ name: "list" });
  }, []);

  if (user === undefined) {
    return (
      <div className="grid h-full place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-text" aria-label="Caricamento" />
      </div>
    );
  }
  if (!user) return <LoginPage onSignedIn={setUser} startupError={startupError} />;

  const nav = [
    { id: "list" as const, label: "Partite", icon: Film },
    { id: "new" as const, label: "Nuova partita", icon: Plus },
    { id: "settings" as const, label: "Impostazioni", icon: SettingsIcon },
  ];
  const current = view.name === "player" ? "list" : view.name;

  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        {/* Spazio per i pulsanti della finestra: si trascina da qui. */}
        <div className="drag h-11 shrink-0" />
        <div className="flex items-center gap-2.5 px-5 pb-5">
          <LogoMark size={20} onDark />
          <span className="text-sm font-semibold tracking-tight">AG Tag</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3" aria-label="Sezioni">
          {nav.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setView({ name: n.id } as View)}
              aria-current={current === n.id ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                current === n.id
                  ? "bg-sidebar-accent font-medium text-sidebar-primary"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <p className="truncate px-2 text-[11px] text-sidebar-foreground/60" title={user.email}>
            {user.email}
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent"
          >
            <LogOut className="h-3.5 w-3.5" />
            Esci
          </button>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="drag absolute inset-x-0 top-0 h-8" />
        {view.name === "list" && <MatchesPage onOpen={(id) => setView({ name: "player", id })} onNew={() => setView({ name: "new" })} />}
        {view.name === "new" && (
          <NewMatchPage onCreated={(id) => setView({ name: "player", id })} onCancel={() => setView({ name: "list" })} />
        )}
        {view.name === "player" && settings && (
          <PlayerPage id={view.id} shortcuts={settings.shortcuts} onBack={() => setView({ name: "list" })} />
        )}
        {view.name === "settings" && settings && <SettingsPage settings={settings} onChange={setSettings} />}
      </main>
    </div>
  );
}
