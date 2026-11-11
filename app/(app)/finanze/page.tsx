import { AreaOverview } from "@/components/hub/area-overview";

export const metadata = { title: "Finanze · AG Workspace" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <AreaOverview areaKey="finanze" />;
}
