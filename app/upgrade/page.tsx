import { headers } from "next/headers";
import { UpgradeClient } from "./UpgradeClient";
import { whopsdk } from "../lib/whop-sdk";
import { getUserPlan } from "../lib/getUserPlan";
import { getPlanPermissions, type PlanPermissions } from "../lib/getPlanPermissions";
import { getWhopUser } from "../lib/getWhopUser";
import { getWhopCompanyId } from "../lib/getWhopCompanyId";

export const dynamic = "force-dynamic";

/**
 * Upgrade Page - For Members and Owners
 * 
 * Whop automatically routes members to /upgrade.
 * Owners can also access /upgrade and toggle admin mode inline.
 * No redirects based on role - both see the same page.
 * 
 * Multi-tenant: Data is isolated per company_id from Whop context.
 */
export default async function Page() {
  // Get company_id from Whop context (required for multi-tenant isolation)
  const companyId = await getWhopCompanyId();
  
  if (!companyId) {
    // No company_id means Whop context is missing
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "#0b0b0b",
        color: "#fff",
        textAlign: "center",
        padding: 40
      }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>Open inside Whop</h1>
          <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)" }}>
            Please open this app from within your Whop experience.
          </p>
        </div>
      </div>
    );
  }

  // Detect if user is owner/admin
  const { isOwner, role } = await getWhopUser();
  
  // Get owner's plan and permissions (CRITICAL: Members see features based on owner's plan, not their own)
  const ownerPlan = await getOwnerPlan(companyId, isOwner);
  const ownerPermissions = getPlanPermissions(ownerPlan);

  return (
    <UpgradeClient
      initialPlan={ownerPlan}
      initialPermissions={ownerPermissions}
      isOwner={isOwner}
      role={role}
      companyId={companyId}
    />
  );
}

/**
 * Get owner's plan for a company (SERVER-SIDE ONLY)
 * 
 * CRITICAL: Members see features based on owner's plan, not their own plan.
 * This ensures members cannot see features that owner hasn't paid for.
 * 
 * Logic:
 * - If current user is owner/admin → use their plan
 * - If current user is member → default to "free" (most restrictive)
 *   (In production, you might want to store owner plan in DB)
 */
async function getOwnerPlan(companyId: string, isOwner: boolean): Promise<"free" | "premium" | "pro"> {
  try {
    // If current user is owner/admin, use their plan
    if (isOwner) {
      const headersList = await headers();
      const token = 
        headersList.get("x-whop-user-token") || 
        headersList.get("x-whop-token") || 
        headersList.get("authorization")?.replace("Bearer ", "");

      if (!token) {
        return "free";
      }

      const { userId } = await whopsdk.verifyUserToken(token);
      if (!userId) {
        return "free";
      }

      return await getUserPlan(userId);
    }

    // Current user is member → default to free (most restrictive)
    // This ensures members don't see features owner hasn't paid for
    // TODO: In production, consider storing owner plan in database
    return "free";
  } catch (error) {
    console.error("Error getting owner plan:", error);
    return "free";
  }
}
