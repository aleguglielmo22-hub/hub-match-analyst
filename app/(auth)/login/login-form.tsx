"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/brand/logo";
import {
  getSupabaseConfig,
  MISSING_SUPABASE_CONFIG_MESSAGE,
} from "@/lib/supabase/config";
import { loginErrorMessage } from "@/lib/auth/login-errors";
import { focusNextFieldOnEnter } from "@/lib/forms/enter-key";
import {
  ACCESS_DENIED_MESSAGE,
  ACCESS_DENIED_PARAM,
  isEmailAllowed,
} from "@/lib/auth/allowlist";
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

const configMissing = getSupabaseConfig() === null;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";
  const accessDenied = searchParams.get("errore") === ACCESS_DENIED_PARAM;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password || configMissing) return;

    setLoading(true);
    const supabase = createClient();
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) {
        const msg = loginErrorMessage(error);
        toast.error(msg.title, { description: msg.description });
        setLoading(false);
        return;
      }
      // Account esistente ma non autorizzato: sessione chiusa subito.
      if (!isEmailAllowed(data.user?.email)) {
        await supabase.auth.signOut({ scope: "local" });
        toast.error("Accesso negato", { description: ACCESS_DENIED_MESSAGE });
        setLoading(false);
        return;
      }
      toast.success("Accesso effettuato");

      // Successo: router.refresh per propagare la nuova sessione + push alla
      // pagina richiesta (di default "/dashboard").
      router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
      router.refresh();
    } catch (err) {
      const msg = loginErrorMessage(err);
      toast.error(msg.title, { description: msg.description });
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/60 bg-card/60 backdrop-blur-sm shadow-2xl shadow-black/40">
      <CardHeader className="space-y-2 text-center">
        <LogoMark size={44} className="mx-auto" />
        <p className="text-[10px] uppercase tracking-[0.25em] text-primary font-semibold">
          AG Workspace
        </p>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Accedi
        </CardTitle>
        <CardDescription className="text-sm">
          Accesso riservato con email e password.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {accessDenied && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-muted-foreground"
          >
            {ACCESS_DENIED_MESSAGE}
          </p>
        )}
        {configMissing && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-muted-foreground"
          >
            {MISSING_SUPABASE_CONFIG_MESSAGE}
          </p>
        )}
        <form
          onSubmit={handleSubmit}
          onKeyDown={focusNextFieldOnEnter}
          className="space-y-4"
        >
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
                inputMode="email"
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
                autoComplete="current-password"
                enterKeyHint="go"
                placeholder="••••••••"
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
            disabled={loading || configMissing || !email.trim() || !password}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accesso…
              </>
            ) : (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                Accedi
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
