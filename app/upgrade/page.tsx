import { headers } from "next/headers";
import { UpgradeClient } from "./UpgradeClient";
import { getWhopUser } from "../lib/getWhopUser";
import { whopsdk } from "../lib/whop-sdk";
import { getUserPlan } from "../lib/getUserPlan";
import { getPlanPermissions } from "../lib/getPlanPermissions";

export const dynamic = "force-dynamic";

/**
 * Upgrade Page - Single Entry Point for ALL Users
 * 
 * ARCHITECTURE:
 * - ALL users (owners + members) always land on /upgrade
 * - This is the ONLY route for normal usage
 * - There must be NO redirects based on role
 * 
 * OWNER DETECTION (SERVER-SIDE ONLY):
 * - Server calls /api/whop/me to determine ownership
 * - isOwner === true ONLY if company role is "owner" or "admin"
 * - On error or uncertainty → isOwner = false (fail-secure)
 * - NEVER trust client-side role checks
 * 
 * RENDERING RULES:
 * - Everyone sees the same Upgrade UI
 * - If isOwner === true: Render OWNER-ONLY configuration UI inline (modal/drawer)
 * - If isOwner === false: Owner UI MUST NOT RENDER AT ALL (no hidden DOM, no disabled buttons)
 * 
 * SECURITY:
 * - Plan configuration is rendered inline on /upgrade for owners only.
 * - This avoids routing issues caused by Whop iframe mounting and joined contexts.
 * - No Whop SDK in client components
 * - No secrets in browser
 * - No client-side ownership trust
 * - All owner checks are server-enforced
 * - Members cannot access config even by URL guessing
 */
export default async function Page() {
  // Server-side ownership check via /api/whop/me
  // This happens before any UI is rendered
  const { isOwner, plan, permissions } = await getOwnerStatusAndPlan();

  // Pass isOwner to client component
  // NO redirects - everyone stays on /upgrade
  return (
    <UpgradeClient
      initialIsOwner={isOwner}
      initialPlan={plan}
      initialPermissions={permissions}
    />
  );
}

/**
 * Get owner status and plan/permissions
 * Uses getWhopUser() for ownership detection (server-side)
 */
async function getOwnerStatusAndPlan(): Promise<{
  isOwner: boolean;
  plan: "free" | "premium" | "pro";
  permissions: { showUpgradeBranding: boolean };
}> {
  try {
    // Check ownership via getWhopUser() (server-side utility)
    const { isOwner } = await getWhopUser();

    // Get plan and permissions (for both owners and members)
    let plan: "free" | "premium" | "pro" = "free";
    let permissions = { showUpgradeBranding: true };

    const headersList = await headers();
    const token = 
      headersList.get("x-whop-user-token") || 
      headersList.get("x-whop-token") || 
      headersList.get("authorization")?.replace("Bearer ", "");

    if (token) {
      try {
        // Verify token and get plan
        const { userId } = await whopsdk.verifyUserToken(token);
        if (userId) {
          plan = await getUserPlan(userId);
          const planPerms = getPlanPermissions(plan);
          permissions = { showUpgradeBranding: planPerms.showUpgradeBranding };
        }
      } catch (error) {
        console.error("Error getting plan:", error);
        // Default to free plan on error
      }
    }

    return {
      isOwner,
      plan,
      permissions,
    };
  } catch (error) {
    console.error("Error in getOwnerStatusAndPlan:", error);
    // On error, default to member (secure default)
              return {
      isOwner: false,
      plan: "free",
      permissions: { showUpgradeBranding: true },
    };
  }
}
