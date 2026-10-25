"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Da mettere DENTRO un <Link> al posto della sua icona: mentre la navigazione
 * è in corso mostra un indicatore che gira, così il tocco non sembra ignorato.
 * `className` dà all'indicatore le stesse dimensioni/margini dell'icona.
 */
export function LinkPendingIcon({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  if (!pending) return <>{children}</>;
  return <Loader2 aria-hidden className={cn(className, "animate-spin")} />;
}
