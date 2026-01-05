import { redirect } from "next/navigation";
import OwnerPageClient from "./OwnerPageClient";
import { getWhopUser } from "../lib/getWhopUser";

export const dynamic = "force-dynamic";

/**
 * Owner Page - Entry Point for Owners
 * 
 * ROUTING RULES:
 * - Server checks ownership via getWhopUser()
 * - If isOwner === false → redirect to /upgrade
 * - If isOwner === true → render owner dashboard
 * 
 * OWNER DETECTION (SERVER-SIDE ONLY):
 * - Uses shared getWhopUser() utility
 * - isOwner === true ONLY if company role is "owner" or "admin"
 * - On error or uncertainty → isOwner = false (fail-secure)
 * 
 * SECURITY:
 * - Ownership is enforced server-side to avoid iframe routing inconsistencies in Whop.
 * - No client-side ownership trust
 * - Members are redirected immediately, never seeing owner UI
 * - All owner checks are server-enforced
 * 
 * Members can NEVER access /owner even via direct URL.
 * Owners should ALWAYS end up on /owner.
 */
export default async function OwnerPage() {
  // Server-side ownership verification
  // This happens before any UI is rendered
  const { isOwner } = await getWhopUser();

  if (isOwner !== true) {
    // Not an owner - redirect to upgrade page
    // This ensures members never see owner configuration UI
    // Members should ALWAYS end up on /upgrade
    redirect("/upgrade");
  }

  // Owner verified - render the owner configuration UI
  // Owners should ALWAYS end up on /owner
  return <OwnerPageClient />;
}
