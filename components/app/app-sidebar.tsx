import { cn } from "@/lib/utils";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUser } from "./sidebar-user";

/**
 * Sidebar persistente da desktop. Su mobile viene incartata in <Sheet> da MobileHeader.
 * Mantiene una struttura a 3 zone: brand (sopra), nav (centro che si espande), user (sotto).
 */
export function AppSidebar({
  email,
  isOwner,
  className,
  onNavigate,
}: {
  email: string;
  isOwner: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <aside
      className={cn(
        "flex w-64 shrink-0 flex-col border-r border-sidebar-border/60 bg-sidebar",
        className,
      )}
    >
      <SidebarBrand />
      <div className="flex-1 overflow-y-auto py-1">
        <SidebarNav isOwner={isOwner} onNavigate={onNavigate} />
      </div>
      <SidebarUser email={email} />
    </aside>
  );
}
