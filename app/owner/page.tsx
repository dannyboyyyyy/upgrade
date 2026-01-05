import { redirect } from "next/navigation";
import { getWhopUser } from "../lib/getWhopUser";

export const dynamic = "force-dynamic";

/**
 * Owner Page - Defensive Route (Legacy Only)
 * 
 * IMPORTANT: This route is LEGACY/DEFENSIVE ONLY.
 * The primary way for owners to configure plans is via inline configuration UI
 * on the /upgrade page (OwnerConfigModal).
 * 
 * ROUTING RULES:
 * - /owner is NOT required for normal usage
 * - /owner may exist for backwards compatibility
 * - If accessed, server checks ownership via getWhopUser()
 * - If isOwner === false → redirect to /upgrade
 * - If isOwner === true → redirect to /upgrade (owners use inline config)
 * 
 * SECURITY:
 * - Ownership is enforced server-side to avoid iframe routing inconsistencies in Whop.
 * - Members are redirected immediately, never seeing owner UI
 * - All owner checks are server-enforced
 * 
 * NOTE: This route redirects ALL users (including owners) to /upgrade
 * because owner configuration is now inline on /upgrade to avoid routing issues.
 */
export default async function OwnerPage() {
  // Server-side ownership verification
  // This happens before any UI is rendered
  const { isOwner } = await getWhopUser();

  if (isOwner !== true) {
            // Not an owner - redirect to upgrade page
    // This ensures members never see owner configuration UI
    redirect("/upgrade");
  }

  // Owner verified - but redirect to /upgrade anyway
  // Owner configuration is now inline on /upgrade to avoid routing issues
  redirect("/upgrade");
}
