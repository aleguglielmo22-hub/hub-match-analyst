import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Disconnette la sessione corrente e ritorna al login.
 * Usare con un <form method="post" action="/auth/sign-out"> oppure fetch.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
