import { redirect } from "next/navigation";

// ALL users (members + owners) load /upgrade by default
// Owners access the dashboard via /upgrade. Members never see it.
export default function RootPage() {
  redirect("/upgrade");
}
