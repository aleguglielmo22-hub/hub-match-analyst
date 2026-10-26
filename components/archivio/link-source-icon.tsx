import { Cloud, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LinkSource } from "@/lib/links/external-links";

/**
 * Icona della fonte di un link esterno. Lucide non ha i marchi, quindi le
 * fonti principali sono disegnate qui in stile lineare (stesso tratto di Lucide).
 */
export function LinkSourceIcon({
  source,
  className,
}: {
  source: LinkSource;
  className?: string;
}) {
  if (source === "onedrive") return <Cloud className={className} />;
  if (source === "altro") return <Link2 className={className} />;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("lucide", className)}
    >
      {PATHS[source]}
    </svg>
  );
}

const PATHS: Record<Exclude<LinkSource, "onedrive" | "altro">, React.ReactNode> = {
  "google-drive": (
    <>
      <path d="M8.5 3h7l6.5 11-3.5 6.5h-13L2 14z" />
      <path d="M8.5 3 15 14h7" />
      <path d="M2 14h13l-3.5 6.5" />
    </>
  ),
  dropbox: (
    <>
      <path d="m7 3-5 3.25L7 9.5l5-3.25z" />
      <path d="m17 3-5 3.25 5 3.25 5-3.25z" />
      <path d="m7 9.5-5 3.25L7 16l5-3.25z" />
      <path d="m17 9.5-5 3.25L17 16l5-3.25z" />
      <path d="m7 18 5 3 5-3" />
    </>
  ),
  youtube: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="m10 9 5 3-5 3z" />
    </>
  ),
  vimeo: <path d="M3 8.5c1.5-1 2.5-2 3.5-1.5S8 11 9 14s2 3 3.5 1 4.5-6.5 4.5-8.5-2-2.5-4-1c1-3.5 6-4.5 6.5-1.5S17 15 13.5 18.5 7 19 6 16 4.5 9.5 3 8.5z" />,
  wyscout: <path d="m3 6 4 12 5-9 5 9 4-12" />,
};
