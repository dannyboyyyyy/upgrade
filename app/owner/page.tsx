import OwnerPageClient from "./OwnerPageClient";
import { getWhopCompanyId } from "../lib/getWhopCompanyId";
import { headers } from "next/headers";
import { whopsdk } from "../lib/whop-sdk";
import { getUserPlan } from "../lib/getUserPlan";

export const dynamic = "force-dynamic";

/**
 * Owner Page - For Owners
 * 
 * Whop automatically routes owners to /owner via dashboard_path.
 * This page renders the owner configuration UI.
 * 
 * Multi-tenant: Data is isolated per company_id from Whop context.
 * Account subscription: Plan is ACCOUNT-SCOPED (follows user across all Whops).
 */
export default async function OwnerPage() {
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

  // Get account subscription (ACCOUNT-SCOPED - follows user across all Whops)
  // This is passed as initialPlan to ensure client-side also has correct plan
  const accountPlan = await getAccountSubscription();

  return <OwnerPageClient companyId={companyId} initialAccountPlan={accountPlan} />;
}

/**
 * Get account subscription plan (ACCOUNT-SCOPED, SERVER-SIDE ONLY)
 * 
 * CRITICAL: Plan is tied to USER ACCOUNT, not company_id.
 * If user purchases Pro/Premium, they have access in ALL Whops they own.
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
