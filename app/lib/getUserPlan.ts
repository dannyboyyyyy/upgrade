import { whopsdk } from "./whop-sdk";

/**
 * Get user's plan by checking access to Premium/Pro products via Whop API
 * 
 * CRITICAL: Permissions are tied to the USER's account (userId), not to a specific Whop company.
 * If a user purchases Premium/Pro, they should have access in ALL Whop companies they use.
 * 
 * This function uses Whop API as the single source of truth:
 * 1. Checks user access to PRO_PRODUCT_ID (from env)
 * 2. Checks user access to PREMIUM_PRODUCT_ID (from env)
 * 3. Returns highest tier found (Pro > Premium > Free)
 * 
 * Whop API endpoints used:
 * - whopsdk.users.checkAccess(productId, { id: userId })
 *   This checks if the user has active access to a specific product across ALL companies
 */
export async function getUserPlan(userId: string): Promise<"free" | "premium" | "pro"> {
  try {
    const proProductId = process.env.PRO_PRODUCT_ID;
    const premiumProductId = process.env.PREMIUM_PRODUCT_ID;

    // Validate that Product IDs are configured
    if (!proProductId || !premiumProductId) {
      console.warn("PRO_PRODUCT_ID or PREMIUM_PRODUCT_ID not configured in environment variables");
      return "free";
    }

    let hasProAccess = false;
    let hasPremiumAccess = false;

    // PRIMARY METHOD: Check access via Whop API using explicit Product IDs
    // This is the most reliable method - checks actual entitlements/purchases
    try {
      // Check Pro access first (highest tier)
      const proAccess = await whopsdk.users.checkAccess(proProductId, { id: userId });
      
      if (proAccess?.has_access && proAccess?.access_level === "customer") {
        hasProAccess = true;
        console.log(`User ${userId} has Pro access`);
      }

      // Only check Premium if Pro not found
      if (!hasProAccess) {
        const premiumAccess = await whopsdk.users.checkAccess(premiumProductId, { id: userId });
        
        if (premiumAccess?.has_access && premiumAccess?.access_level === "customer") {
          hasPremiumAccess = true;
          console.log(`User ${userId} has Premium access`);
        }
      }
    } catch (accessError: any) {
      // If checkAccess fails, log error but don't throw
      // This could happen if Product IDs are wrong or user doesn't exist
      console.error("Error checking user access via Whop API:", {
        error: accessError?.message || accessError,
        userId,
        proProductId,
        premiumProductId,
      });
      
      // Don't return free immediately - might be a temporary API issue
      // Let the function continue to see if we can get any information
    }

    // Return highest tier found
    if (hasProAccess) return "pro";
    if (hasPremiumAccess) return "premium";
    
    // No active subscription found
    console.log(`User ${userId} has no active subscription - defaulting to free plan`);
    return "free";
  } catch (error) {
    console.error("Error checking user plan:", error);
    // On error, default to free (safe default)
    return "free";
  }
}



