import { headers } from "next/headers";
import { UpgradeClient } from "./UpgradeClient";
import { whopsdk } from "../lib/whop-sdk";
import { getUserPlan } from "../lib/getUserPlan";
import { getPlanPermissions } from "../lib/getPlanPermissions";
import { getWhopUser } from "../lib/getWhopUser";

export const dynamic = "force-dynamic";

/**
 * Upgrade Page - For Members and Owners
 * 
 * Whop automatically routes members to /upgrade.
 * Owners can also access /upgrade and toggle admin mode inline.
 * No redirects based on role - both see the same page.
 */
export default async function Page() {
  // Get plan and permissions for user
  const { plan, permissions } = await getMemberPlanAndPermissions();
  
  // Detect if user is owner/admin
  const { isOwner, role } = await getWhopUser();

  return (
    <UpgradeClient
      initialPlan={plan}
      initialPermissions={permissions}
      isOwner={isOwner}
      role={role}
    />
  );
}

/**
 * Get member's plan and permissions
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
    const planPerms = getPlanPermissions(plan);

    return {
      plan,
      permissions: { showUpgradeBranding: planPerms.showUpgradeBranding },
    };
  } catch (error) {
    console.error("Error getting member plan:", error);
    return {
      plan: "free",
      permissions: { showUpgradeBranding: true },
    };
  }
}
