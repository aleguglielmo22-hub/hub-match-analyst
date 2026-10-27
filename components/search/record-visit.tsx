"use client";

import { useEffect } from "react";
import { rememberOpened, type RecentItem } from "@/lib/search/recent";

/** Ricorda l'elemento aperto, per "Aperti di recente" nella ricerca. */
export function RecordVisit(item: RecentItem) {
  const { kind, id, title, subtitle, href } = item;
  useEffect(() => {
    rememberOpened({ kind, id, title, subtitle, href });
  }, [kind, id, title, subtitle, href]);
  return null;
}
