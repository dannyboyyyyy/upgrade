import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import OwnerPageClient from "./OwnerPageClient";

export const dynamic = "force-dynamic";

/**
 * Owner Page - Server-Side Protected Route
 * 
 * ARCHITECTURE:
 * - /owner route MUST verify isOwner server-side
 * - If isOwner !== true → redirect to /upgrade
 * - Never rely on client-only checks
 * - Never allow members to access configuration, even via direct URL
 * 
 * SECURITY:
 * - Ownership check happens server-side before any UI is rendered
 * - Members are redirected immediately, never seeing owner UI
 * - All owner checks are server-enforced
 * 
 * ACCESS:
 * - Only owners can access this route
 * - Members attempting to access /owner are redirected to /upgrade
 * 
 * NOTE: Token can come from:
 * - Headers (when Whop loads app in iframe)
 * - Cookies (set by client-side when token is in URL params)
 * - We check both to support navigation from /upgrade to /owner
 */
async function checkOwnerAccess(searchParams?: { token?: string }): Promise<boolean> {
  try {
    const headersList = await headers();
    const cookieStore = await cookies();
    
    // Get token from multiple sources:
    // 1. Headers (Whop passes this when loading in iframe)
    // 2. Cookies (set by client-side when token is in URL params)
    // 3. URL search params (passed via searchParams prop)
    const token = 
      headersList.get("x-whop-user-token") || 
      headersList.get("x-whop-token") || 
      headersList.get("authorization")?.replace("Bearer ", "") ||
      cookieStore.get("whop_token")?.value ||
      searchParams?.token ||
      null;

    if (!token) {
      // No token = not an owner
      console.log("No token found in headers, cookies, or searchParams");
      return false;
    }

    // Check ownership via internal API route
    // Use relative URL for internal API calls (works in production)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (typeof process !== "undefined" && process.env.VERCEL_URL 
                      ? `https://${process.env.VERCEL_URL}` 
                      : "http://localhost:3000");
    
    try {
      // Try relative URL first (works better in production)
      let ownerResponse;
      try {
        ownerResponse = await fetch(`${baseUrl}/api/whop/me`, {
          headers: {
            "x-whop-user-token": token,
            "x-whop-token": token,
          },
          cache: "no-store",
        });
      } catch (fetchError) {
        // If absolute URL fails, try relative URL
        console.log("Absolute URL failed, trying relative URL");
        ownerResponse = await fetch("/api/whop/me", {
          headers: {
            "x-whop-user-token": token,
            "x-whop-token": token,
          },
          cache: "no-store",
        });
      }

      if (ownerResponse.ok) {
        const ownerData = await ownerResponse.json();
        // Strict check: isOwner === true only if explicitly true
        const isOwner = ownerData.isOwner === true;
        console.log("Owner check result:", { isOwner, role: ownerData.role });
        return isOwner;
      }

      // Request failed = not an owner (secure default)
      console.log("Owner API request failed:", ownerResponse.status);
      return false;
    } catch (err) {
      console.error("Error checking owner access:", err);
      // On error = not an owner (secure default)
      return false;
    }
  } catch (error) {
    console.error("Error in checkOwnerAccess:", error);
    // On error = not an owner (secure default)
    return false;
  }
}

export default async function OwnerPage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  // Server-side ownership verification
  // This happens before any UI is rendered
  const isOwner = await checkOwnerAccess(searchParams);

  if (!isOwner) {
    // Not an owner - redirect to upgrade page
    // This ensures members never see owner configuration UI
    console.log("User is not an owner, redirecting to /upgrade");
    redirect("/upgrade");
  }

  // Owner verified - render the owner configuration UI
  console.log("User is owner, rendering OwnerPageClient");
  return <OwnerPageClient />;
}
