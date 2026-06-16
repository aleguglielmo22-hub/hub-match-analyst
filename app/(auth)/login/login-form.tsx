"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2, ArrowRight, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    const supabase = createClient();
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) {
          toast.error("Accesso fallito", { description: error.message });
          setLoading(false);
          return;
        }
        toast.success("Accesso effettuato");
      } else {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) {
          toast.error("Registrazione fallita", { description: error.message });
          setLoading(false);
          return;
        }
        toast.success("Account creato");
      }

      // Successo: router.refresh per propagare la nuova sessione + push alla
      // pagina richiesta (di default "/dashboard").
      router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      toast.error("Operazione fallita", { description: message });
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/60 bg-card/60 backdrop-blur-sm shadow-2xl shadow-black/40">
      <CardHeader className="space-y-2 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-primary font-semibold">
          Hub Match Analyst
        </p>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Accedi" : "Crea il tuo account"}
        </CardTitle>
        <CardDescription className="text-sm">
          {mode === "signin"
            ? "Email e password — entri subito, niente conferme."
            : "Email e password — il tuo account è attivo immediatamente."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="nome@esempio.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                placeholder={mode === "signup" ? "Min. 6 caratteri" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="pl-8"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "signin" ? "Accesso…" : "Creazione…"}
              </>
            ) : mode === "signin" ? (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                Accedi
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Crea account
              </>
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "signin" ? "Non hai un account?" : "Hai già un account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            disabled={loading}
            className="text-primary underline-offset-2 hover:underline disabled:opacity-50"
          >
            {mode === "signin" ? "Registrati" : "Accedi"}
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
