import { whopsdk } from "./whop-sdk";

/**
 * Get user's plan by checking Whop App entitlements (subscription products)
 * 
 * CRITICAL: Permissions are tied to the USER's account (userId), not to a specific Whop company.
 * If a user purchases Premium/Pro, they should have access in ALL Whop companies they use.
 * 
 * This function uses Whop App entitlements as the single source of truth:
 * 1. Checks access to PREMIUM_PLAN_ID (Whop App subscription product)
 * 2. If Premium access → return "premium"
 * 3. Else checks access to PRO_PLAN_ID (Whop App subscription product)
 * 4. If Pro access → return "pro"
 * 5. Else → return "free"
 * 
 * Whop API endpoints used:
 * - whopsdk.users.checkAccess(productId, { id: userId })
 *   This checks if the user has active entitlement to the App subscription product
 */
export async function getUserPlan(userId: string): Promise<"free" | "premium" | "pro"> {
  try {
    // Read environment variables for plan product IDs
    const premiumPlanId = process.env.PREMIUM_PLAN_ID;
    const proPlanId = process.env.PRO_PLAN_ID;

    // Validate that Plan IDs are configured - throw clear error if missing
    if (!premiumPlanId) {
      throw new Error("PREMIUM_PLAN_ID environment variable is not configured");
    }
    if (!proPlanId) {
      throw new Error("PRO_PLAN_ID environment variable is not configured");
    }

    // Log configuration
    console.log("[getUserPlan] Checking entitlements for user:", {
      userId,
      premiumPlanId,
      proPlanId,
    });

    // Step 1: Check Premium entitlement first
    try {
      const premiumAccess = await whopsdk.users.checkAccess(premiumPlanId, { id: userId });
      
      // Log full checkAccess response
      console.log(`[getUserPlan] Premium entitlement check for user ${userId}:`, {
        productId: premiumPlanId,
        response: JSON.stringify(premiumAccess, null, 2),
        hasAccess: premiumAccess?.has_access,
        accessLevel: premiumAccess?.access_level,
      });

      // Treat ANY truthy access response as valid
      // has_access === true is the primary indicator
      const hasPremiumAccess = premiumAccess?.has_access === true;

      if (hasPremiumAccess) {
        const resolvedPlan = "premium";
        console.log(`[getUserPlan] ✅ Resolved plan for user ${userId}:`, {
          plan: resolvedPlan,
          productId: premiumPlanId,
          hasAccess: premiumAccess?.has_access,
          accessLevel: premiumAccess?.access_level,
        });
        return resolvedPlan;
      }
    } catch (premiumError: any) {
      // Log error but continue to check Pro
      console.error(`[getUserPlan] Error checking Premium entitlement for user ${userId}:`, {
        error: premiumError?.message || premiumError,
        errorStack: premiumError?.stack,
        productId: premiumPlanId,
      });
    }

    // Step 2: Check Pro entitlement (only if Premium not found)
    try {
      const proAccess = await whopsdk.users.checkAccess(proPlanId, { id: userId });
      
      // Log full checkAccess response
      console.log(`[getUserPlan] Pro entitlement check for user ${userId}:`, {
        productId: proPlanId,
        response: JSON.stringify(proAccess, null, 2),
        hasAccess: proAccess?.has_access,
        accessLevel: proAccess?.access_level,
      });

      // Treat ANY truthy access response as valid
      // has_access === true is the primary indicator
      const hasProAccess = proAccess?.has_access === true;

      if (hasProAccess) {
        const resolvedPlan = "pro";
        console.log(`[getUserPlan] ✅ Resolved plan for user ${userId}:`, {
          plan: resolvedPlan,
          productId: proPlanId,
          hasAccess: proAccess?.has_access,
          accessLevel: proAccess?.access_level,
        });
        return resolvedPlan;
      }
    } catch (proError: any) {
      // Log error but continue to return free
      console.error(`[getUserPlan] Error checking Pro entitlement for user ${userId}:`, {
        error: proError?.message || proError,
        errorStack: proError?.stack,
        productId: proPlanId,
      });
    }

    // Step 3: No entitlements found → return free
    const resolvedPlan = "free";
    console.log(`[getUserPlan] ✅ Resolved plan for user ${userId}:`, {
      plan: resolvedPlan,
      reason: "No Premium or Pro entitlements found",
    });
    return resolvedPlan;

  } catch (error: any) {
    // Re-throw configuration errors
    if (error.message?.includes("environment variable is not configured")) {
      throw error;
    }

    // Log and return free for other errors
    console.error("[getUserPlan] Unexpected error checking user plan:", {
      error: error?.message || error,
      errorStack: error?.stack,
      userId,
    });
    return "free";
  }
}



