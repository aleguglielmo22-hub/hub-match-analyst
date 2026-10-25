import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Lockup brand della sidebar: logo AG Workspace + sottotitolo.
 * In futuro qui sotto può comparire un selettore di workspace.
 */
export function SidebarBrand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center px-4 py-4 text-sidebar-foreground transition-opacity hover:opacity-90"
    >
      <Logo subtitle="Performance · Scouting" />
    </Link>
  );
}
