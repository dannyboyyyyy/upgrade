import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UpgradeClient } from "./UpgradeClient";
import { getWhopUser } from "../lib/getWhopUser";
import { whopsdk } from "../lib/whop-sdk";
import { getUserPlan } from "../lib/getUserPlan";
import { getPlanPermissions } from "../lib/getPlanPermissions";

export const dynamic = "force-dynamic";

/**
 * Upgrade Page - For Members Only
 * 
 * ROUTING:
 * - This page is for members (non-owners)
 * - Owners are redirected to /owner
 * 
 * OWNER DETECTION (SERVER-SIDE ONLY):
 * - Uses getWhopUser() for ownership detection
 * - isOwner === true ONLY if company role is "owner" or "admin"
 * - On error or uncertainty → isOwner = false (fail-secure)
 */
export default async function Page() {
  // Server-side ownership check
  const { isOwner } = await getWhopUser();

  // Redirect owners to /owner
  if (isOwner === true) {
    redirect("/owner");
  }

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
