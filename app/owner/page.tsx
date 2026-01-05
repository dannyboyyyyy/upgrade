import { redirect } from "next/navigation";
import OwnerPageClient from "./OwnerPageClient";
import { getWhopUser } from "../lib/getWhopUser";

export const dynamic = "force-dynamic";

/**
 * Owner Page - For Owners Only
 * 
 * ROUTING:
 * - This page is for owners/admins only
 * - Non-owners are redirected to /upgrade
 * 
 * OWNER DETECTION (SERVER-SIDE ONLY):
 * - Uses getWhopUser() for ownership detection
 * - isOwner === true ONLY if company role is "owner" or "admin"
 * - On error or uncertainty → isOwner = false (fail-secure)
 */
export default async function OwnerPage() {
  // Server-side ownership verification
  const { isOwner } = await getWhopUser();

  // Redirect non-owners to /upgrade
  if (isOwner !== true) {
    redirect("/upgrade");
  }

  // Owner verified - render owner dashboard
  return <OwnerPageClient />;
}
