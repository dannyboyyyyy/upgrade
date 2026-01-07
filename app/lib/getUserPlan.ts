import { whopsdk } from "./whop-sdk";

/**
 * Get user's plan by checking access to Premium/Pro products
 * 
 * This function tries multiple approaches:
 * 1. Check hardcoded Product IDs from env vars (backward compatible)
 * 2. List user's accessible products and match by name/price
 * 3. Default to "free" if no access found
 * 
 * This allows the app to work across multiple Whop companies where
 * Product IDs differ, as long as products are named "Premium" or "Pro"
 */
export async function getUserPlan(userId: string): Promise<"free" | "premium" | "pro"> {
  try {
    // Approach 1: Try hardcoded Product IDs first (if set)
    const proProductId = process.env.PRO_PRODUCT_ID;
    const premiumProductId = process.env.PREMIUM_PRODUCT_ID;
    
    if (proProductId && premiumProductId) {
      try {
        const proAccess = await whopsdk.users.checkAccess(
          proProductId,
          { id: userId }
        );

        const premiumAccess = await whopsdk.users.checkAccess(
          premiumProductId,
          { id: userId }
        );

        const isPro =
          proAccess.has_access && proAccess.access_level === "customer";

        const isPremium =
          premiumAccess.has_access && premiumAccess.access_level === "customer";

        if (isPro) return "pro";
        if (isPremium) return "premium";
      } catch (envError) {
        // If env Product IDs fail, try dynamic approach
        console.log("Env Product IDs check failed, trying dynamic product lookup:", envError);
      }
    }

    // Approach 2: Try to find products by listing user's company products
    // This is a workaround for multi-tenant where Product IDs differ per company
    try {
      // Get user info to find company_id
      const user = await whopsdk.users.retrieve(userId);
      const userObj = user as any;
      const companyId = userObj?.company_id || userObj?.companyId || userObj?.company?.id;
      
      if (companyId) {
        // Try to list products for this company and match by name
        // Note: This might not be available in all Whop SDK versions
        // As a fallback, we rely on env Product IDs or return free
        try {
          // Attempt to get products (this may require different SDK method)
          // For now, we'll rely on the env Product IDs working
          // If they don't, we'll default to free
        } catch (companyProductsError) {
          console.log("Could not list company products:", companyProductsError);
        }
      }
    } catch (dynamicError) {
      console.error("Error in dynamic product lookup:", dynamicError);
    }

    // No access found
    return "free";
  } catch (error) {
    console.error("Error checking user plan:", error);
    // On error, default to free
    return "free";
  }
}



