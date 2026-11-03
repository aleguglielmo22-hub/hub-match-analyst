import { useState, type FormEvent } from "react";
import { Loader2, LogIn } from "lucide-react";
import type { UserInfo } from "@shared/api";
import { LogoMark } from "../components/Logo";
import { Button, ErrorBox, Field, Input } from "../components/ui";
import { api, errorMessage } from "../lib/api";

/** Accesso con lo stesso account di AG Workspace (email e password). */
export function LoginPage({
  onSignedIn,
  startupError,
}: {
  onSignedIn: (u: UserInfo) => void;
  startupError: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(startupError);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.auth.signIn(email, password);
      if (res.ok) onSignedIn(res.user);
      else setError(res.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid h-full place-items-center px-6">
      <div className="drag absolute inset-x-0 top-0 h-10" />
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <LogoMark size={36} />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary-text">AG Tag</p>
          <h1 className="text-xl font-semibold">Accedi</h1>
          <p className="text-sm text-muted-foreground">Usa l'account di AG Workspace.</p>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <Field label="Email">
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full" disabled={busy || !email.trim() || !password}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Accedi
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">La sessione resta salvata sul Mac, cifrata nel Portachiavi.</p>
      </form>
    </div>
  );
}
