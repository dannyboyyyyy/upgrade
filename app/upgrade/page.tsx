import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UpgradeClient } from "./UpgradeClient";
import { getWhopUser } from "../lib/getWhopUser";
import { whopsdk } from "../lib/whop-sdk";
import { getUserPlan } from "../lib/getUserPlan";
import { getPlanPermissions } from "../lib/getPlanPermissions";

export const dynamic = "force-dynamic";

/**
 * Upgrade Page - Entry Point for Members
 * 
 * ROUTING RULES:
 * - This is the public entry point
 * - Server checks ownership via getWhopUser()
 * - If isOwner === true → redirect to /owner
 * - If isOwner === false → render upgrade page
 * 
 * OWNER DETECTION (SERVER-SIDE ONLY):
 * - Uses shared getWhopUser() utility
 * - isOwner === true ONLY if company role is "owner" or "admin"
 * - On error or uncertainty → isOwner = false (fail-secure)
 * 
 * SECURITY:
 * - Ownership is enforced server-side to avoid iframe routing inconsistencies in Whop.
 * - No client-side ownership trust
 * - No inline owner UI
 * - No modals
 * - Routing is deterministic and server-enforced
 * 
 * Members can NEVER access /owner even via direct URL.
 * Owners are automatically redirected to /owner and can NEVER see member upgrade view.
 */
export default async function Page() {
  // Server-side ownership check
  // This happens before any UI is rendered
  const { isOwner } = await getWhopUser();

  if (isOwner === true) {
    // Owner detected - redirect to owner dashboard
    // Owners should ALWAYS end up on /owner
    redirect("/owner");
  }

  // Member confirmed - render upgrade page
  // Members should ALWAYS end up on /upgrade
  // Get plan and permissions for member
  const { plan, permissions } = await getMemberPlanAndPermissions();

  return (
    <UpgradeClient
      initialPlan={plan}
      initialPermissions={permissions}
    />
  );
}

/**
 * Get member's plan and permissions
 * This is only called for members (owners are redirected)
 */
async function getMemberPlanAndPermissions(): Promise<{
  plan: "free" | "premium" | "pro";
  permissions: { showUpgradeBranding: boolean };
}> {
  try {
    const headersList = await headers();
    const token = 
      headersList.get("x-whop-user-token") || 
      headersList.get("x-whop-token") || 
      headersList.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return {
        plan: "free",
        permissions: { showUpgradeBranding: true },
      };
    }

    // Verify token and get plan
    const { userId } = await whopsdk.verifyUserToken(token);
    if (!userId) {
      return {
        plan: "free",
        permissions: { showUpgradeBranding: true },
      };
    }

    const plan = await getUserPlan(userId);
    const permissions = getPlanPermissions(plan);

    return {
      plan,
      permissions: { showUpgradeBranding: permissions.showUpgradeBranding },
    };
  } catch (error) {
    console.error("Error getting member plan:", error);
    return {
      plan: "free",
      permissions: { showUpgradeBranding: true },
    };
  }
}
