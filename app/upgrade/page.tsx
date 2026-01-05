import { headers } from "next/headers";
import { UpgradeClient } from "./UpgradeClient";
import { whopsdk } from "../lib/whop-sdk";
import { getUserPlan } from "../lib/getUserPlan";
import { getPlanPermissions } from "../lib/getPlanPermissions";

export const dynamic = "force-dynamic";

/**
 * Upgrade Page - For Members
 * 
 * Whop automatically routes members to /upgrade.
 * This page renders the upgrade UI for members.
 */
export default async function Page() {
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
