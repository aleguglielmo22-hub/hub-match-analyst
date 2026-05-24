import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Entry point dell'app: instradiamo l'utente al posto giusto.
 * - Loggato → /archivio (la sezione principale, anche se per ora è un placeholder).
 * - Anonimo → /login
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/archivio" : "/login");
}
