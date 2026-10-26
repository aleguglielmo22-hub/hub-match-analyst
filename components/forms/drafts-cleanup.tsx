"use client";

import { useEffect } from "react";
import { browserStorage, purgeOldDrafts } from "@/lib/forms/draft";

/** All'apertura dell'app elimina le bozze dei form più vecchie di 30 giorni. */
export function DraftsCleanup() {
  useEffect(() => {
    purgeOldDrafts(browserStorage());
  }, []);
  return null;
}
