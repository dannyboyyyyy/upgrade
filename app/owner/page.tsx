import OwnerPageClient from "./OwnerPageClient";
import { getWhopCompanyId } from "../lib/getWhopCompanyId";

export const dynamic = "force-dynamic";

/**
 * Owner Page - For Owners
 * 
 * Whop automatically routes owners to /owner via dashboard_path.
 * This page renders the owner configuration UI.
 * 
 * Multi-tenant: Data is isolated per company_id from Whop context.
 * No redirects - Whop handles routing.
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

  return <OwnerPageClient companyId={companyId} />;
}
