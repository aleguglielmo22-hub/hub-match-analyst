import { AreaOverview } from "@/components/hub/area-overview";

export const metadata = { title: "Studi · AG Workspace" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <AreaOverview areaKey="studi" />;
}
