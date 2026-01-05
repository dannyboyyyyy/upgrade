import { headers } from "next/headers";
import { UpgradeClient } from "./UpgradeClient";

export const dynamic = "force-dynamic";

/**
 * Upgrade Page - Single Entry Point for ALL Users
 * 
 * ARCHITECTURE:
 * - ALL users (owners + members) load the app at /upgrade
 * - This is the ONLY page - no routing to /owner
 * - No redirects, no token passing via URL
 * 
 * OWNER CONFIGURATION (INLINE):
 * - Owners see "Configure Plans" button that opens OwnerConfigModal inline
 * - Plan configuration is rendered inline on /upgrade to avoid routing issues caused by Whop iframe mounting
 * - Members never see owner configuration UI (not even hidden in DOM)
 * 
 * OWNER DETECTION (SERVER-SIDE ONLY):
 * - Use /api/whop/me to determine isOwner = true ONLY if company role is "owner" or "admin"
 * - On error or uncertainty → isOwner = false
 * - This check MUST be server-side (RSC or route handler)
 * 
 * SECURITY GUARANTEES:
 * - No Whop SDK in client components
 * - No secrets in client
 * - No client-side trust for ownership
 * - All owner checks are server-enforced
 * - Ownership enforced server-side before rendering owner UI
 */
async function getOwnerStatus(): Promise<{ isOwner: boolean; plan: "free" | "premium" | "pro"; permissions: { showUpgradeBranding: boolean } }> {
  try {
    const headersList = await headers();
    
    // Get token from headers (Whop passes this when loading in iframe)
    const token = 
      headersList.get("x-whop-user-token") || 
      headersList.get("x-whop-token") || 
      headersList.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      // No token - default to member (non-owner)
      return {
        isOwner: false,
        plan: "free",
        permissions: { showUpgradeBranding: true },
      };
    }

    // Check ownership via internal API route
    // Try relative URL first (works better in production)
    try {
      let ownerResponse;
      try {
        // Try relative URL first (works in both dev and production)
        ownerResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/whop/me`, {
          headers: {
            "x-whop-user-token": token,
            "x-whop-token": token,
          },
          cache: "no-store",
        });
      } catch (fetchError) {
        // If absolute URL fails, try relative URL
        const headersList = await headers();
        const host = headersList.get("host") || "localhost:3000";
        const protocol = headersList.get("x-forwarded-proto") || "http";
        ownerResponse = await fetch(`${protocol}://${host}/api/whop/me`, {
          headers: {
            "x-whop-user-token": token,
            "x-whop-token": token,
          },
          cache: "no-store",
        });
      }

      let isOwner = false;
      if (ownerResponse.ok) {
        const ownerData = await ownerResponse.json();
        // Strict check: isOwner === true only if explicitly true
        isOwner = ownerData.isOwner === true;
        console.log("[Server] Owner check result:", { isOwner, role: ownerData.role });
      } else {
        console.log("[Server] Owner API request failed:", ownerResponse.status);
      }

      // Get plan and permissions
      let verifyResponse;
      try {
        verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/whop/verify`, {
          headers: {
            "x-whop-user-token": token,
            "x-whop-token": token,
          },
          cache: "no-store",
        });
      } catch (fetchError) {
        // If absolute URL fails, try relative URL
        const headersList = await headers();
        const host = headersList.get("host") || "localhost:3000";
        const protocol = headersList.get("x-forwarded-proto") || "http";
        verifyResponse = await fetch(`${protocol}://${host}/api/whop/verify`, {
          headers: {
            "x-whop-user-token": token,
            "x-whop-token": token,
          },
          cache: "no-store",
        });
      }

      if (verifyResponse.ok) {
        const data = await verifyResponse.json();
        return {
          isOwner,
          plan: data.plan || "free",
          permissions: { showUpgradeBranding: data.permissions?.showUpgradeBranding ?? true },
        };
      }

      // Default to free plan if verification fails
      return {
        isOwner,
        plan: "free",
        permissions: { showUpgradeBranding: true },
      };
    } catch (err) {
      console.error("Error checking owner status:", err);
      // On error, default to member (secure default)
      return {
        isOwner: false,
        plan: "free",
        permissions: { showUpgradeBranding: true },
      };
    }
  } catch (error) {
    console.error("Error in getOwnerStatus:", error);
    // On error, default to member (secure default)
    return {
      isOwner: false,
      plan: "free",
      permissions: { showUpgradeBranding: true },
    };
  }
}

export default async function Page() {
  // Server-side ownership check
  // This ensures ownership is verified before any UI is rendered
  // Members will never see owner configuration UI
  const { isOwner, plan, permissions } = await getOwnerStatus();

  // Debug: Log owner status
  console.log("[Page] Server-side owner check:", { isOwner, plan });

  return (
    <UpgradeClient
      initialIsOwner={isOwner}
      initialPlan={plan}
      initialPermissions={permissions}
    />
  );
}
