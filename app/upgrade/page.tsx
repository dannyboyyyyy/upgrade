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
  
  // Get account subscription (ACCOUNT-SCOPED - follows user across all Whops)
  const accountPlan = await getAccountSubscription();
  const accountPermissions = getPlanPermissions(accountPlan);

  return (
    <UpgradeClient
      initialPlan={accountPlan}
      initialPermissions={accountPermissions}
      isOwner={isOwner}
      role={role}
      companyId={companyId}
    />
  );
}

/**
 * Get account subscription plan (ACCOUNT-SCOPED, SERVER-SIDE ONLY)
 * 
 * CRITICAL: Plan is tied to USER ACCOUNT, not company_id.
 * If user purchases Pro/Premium, they have access in ALL Whops they own.
 * 
 * Returns account's active plan from Whop, or "free" if no subscription exists.
 */
async function getAccountSubscription(): Promise<"free" | "premium" | "pro"> {
  try {
    const headersList = await headers();
    const token = 
      headersList.get("x-whop-user-token") || 
      headersList.get("x-whop-token") || 
      headersList.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return "free";
    }

    // Verify token and get userId
    const { userId } = await whopsdk.verifyUserToken(token);
    if (!userId) {
      return "free";
    }

    // Get account subscription plan (account-scoped, not company-scoped)
    const plan = await getUserPlan(userId);
    return plan;
  } catch (error) {
    console.error("Error getting account subscription:", error);
    return "free";
  }
}
