import { headers } from "next/headers";
import { UpgradeClient } from "./UpgradeClient";

export const dynamic = "force-dynamic";

/**
 * Upgrade Page - Entry Point for ALL Users
 * 
 * ARCHITECTURE:
 * - ALL users (owners + members) load the app at /upgrade
 * - Members: See upgrade page only, cannot access /owner
 * - Owners: See upgrade page + "Owner Dashboard" button linking to /owner
 * 
 * OWNER ACCESS:
 * - Owners see "Owner Dashboard" button that navigates to /owner
 * - /owner route is server-side protected (redirects non-owners)
 * - Members never see owner configuration UI
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
    // Note: In production, consider calling Whop SDK directly here for better performance
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    try {
      // Check ownership
      const ownerResponse = await fetch(`${baseUrl}/api/whop/me`, {
        headers: {
          "x-whop-user-token": token,
          "x-whop-token": token,
        },
        cache: "no-store",
      });

      let isOwner = false;
      if (ownerResponse.ok) {
        const ownerData = await ownerResponse.json();
        // Strict check: isOwner === true only if explicitly true
        isOwner = ownerData.isOwner === true;
      }

      // Get plan and permissions
      const verifyResponse = await fetch(`${baseUrl}/api/whop/verify`, {
        headers: {
          "x-whop-user-token": token,
          "x-whop-token": token,
        },
        cache: "no-store",
      });

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

  return (
    <UpgradeClient
      initialIsOwner={isOwner}
      initialPlan={plan}
      initialPermissions={permissions}
    />
  );
}
