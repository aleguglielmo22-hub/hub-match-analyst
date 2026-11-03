import { Circle, CircleCheck, CircleX, Contrast } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusOsservazioneEnum } from "@/lib/types/scouting";

/** Simbolo di ogni stato di osservazione: lo stato non si legge solo dal colore. */
const ICON = {
  DA_VISIONARE: Circle, // ○
  IN_OSSERVAZIONE: Contrast, // ◐
  APPROVATO: CircleCheck, // ✓
  RIFIUTATO: CircleX, // ✕
} satisfies Record<StatusOsservazioneEnum, typeof Circle>;

export function StatusIcon({ status, className }: { status: StatusOsservazioneEnum; className?: string }) {
  const Icon = ICON[status];
  return <Icon aria-hidden className={cn("h-3 w-3 shrink-0", className)} />;
}
