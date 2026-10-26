import { redirect } from "next/navigation";

/** Il cestino del Cloud è confluito nel cestino unico. */
export default function CestinoCloudPage() {
  redirect("/cestino?sezione=cloud");
}
