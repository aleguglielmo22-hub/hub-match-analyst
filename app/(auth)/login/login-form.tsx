"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
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

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/archivio";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo },
    });

    setLoading(false);

    if (error) {
      toast.error("Invio fallito", { description: error.message });
      return;
    }

    setSent(true);
    toast.success("Link inviato. Controlla la posta.");
  }

  return (
    <Card className="w-full max-w-md border-border/60 bg-card/60 backdrop-blur-sm shadow-2xl shadow-black/40">
      <CardHeader className="space-y-2 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-primary font-semibold">
          Hub Match Analyst
        </p>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {sent ? "Controlla la posta" : "Accedi"}
        </CardTitle>
        <CardDescription className="text-sm">
          {sent
            ? `Abbiamo inviato un link di accesso a ${email}. Cliccalo entro 60 minuti per entrare.`
            : "Ti mandiamo un link di accesso via email. Niente password da ricordare."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {sent ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground">
              Non vedi nulla? Controlla la cartella <strong>spam</strong> o{" "}
              <button
                type="button"
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                usa un&apos;altra email
              </button>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Invio in corso…
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Invia magic link
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
