import { redirect } from "next/navigation";
import OwnerPageClient from "./OwnerPageClient";
import { getWhopUser } from "../lib/getWhopUser";

export const dynamic = "force-dynamic";

/**
 * Owner Page - For Owners
 * 
 * Whop automatically routes owners to /owner.
 * This page renders the owner configuration UI.
 * 
 * Security: Still verify ownership server-side in case someone tries to access directly.
 */
export default async function OwnerPage() {
  // Server-side ownership verification (defensive - Whop should already route correctly)
  const { isOwner } = await getWhopUser();

  // Redirect non-owners to /upgrade (defensive measure)
  if (isOwner !== true) {
    redirect("/upgrade");
  }

  // Owner verified - render owner dashboard
  return <OwnerPageClient />;
}
