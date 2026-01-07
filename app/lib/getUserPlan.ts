import { whopsdk } from "./whop-sdk";

/**
 * Get user's plan by checking access to Premium/Pro products
 * 
 * CRITICAL: Permissions are tied to the USER's account (userId), not to a specific Whop company.
 * If a user purchases Premium/Pro, they should have access in ALL Whop companies they use.
 * 
 * This function checks:
 * 1. User's orders/purchases across all companies
 * 2. Matches products by name (Premium/Pro) or price ($9.99/$14.99)
 * 3. Returns highest tier found (Pro > Premium > Free)
 */
export async function getUserPlan(userId: string): Promise<"free" | "premium" | "pro"> {
  try {
    let foundPro = false;
    let foundPremium = false;

    // Approach 1: Check user's orders to find Premium/Pro purchases
    // This works across all Whop companies the user has access to
    try {
      // Get user's orders/purchases
      const orders = await (whopsdk as any).orders?.list({ user_id: userId }) || { data: [] };
      
      // Check each order for Premium/Pro products
      for (const order of orders.data || []) {
        if (order.status !== "completed" && order.status !== "active") {
          continue;
        }

        // Get product details from order
        const productId = order.product_id || order.product?.id;
        if (!productId) continue;

        try {
          const product = await whopsdk.products.retrieve(productId);
          const productObj = product as any;
          const productName = (productObj?.name || "").toLowerCase();
          const productPrice = productObj?.price || 0;

          // Match Pro: name contains "pro" OR price is around $14.99
          if (
            productName.includes("pro") ||
            (productPrice >= 14.00 && productPrice <= 15.99) ||
            productPrice >= 89.00 // Yearly Pro ($89.99)
          ) {
            foundPro = true;
          }

          // Match Premium: name contains "premium" OR price is around $9.99
          if (
            productName.includes("premium") ||
            (productPrice >= 9.00 && productPrice <= 10.99) ||
            (productPrice >= 89.00 && productPrice <= 90.00) // Yearly Premium ($89.99)
          ) {
            foundPremium = true;
          }
        } catch (productError) {
          // Skip products we can't retrieve
          continue;
        }
      }
    } catch (ordersError) {
      console.log("Could not fetch user orders, trying alternative method:", ordersError);
    }

    // Approach 2: Fallback - Try hardcoded Product IDs from env vars
    // This is for backward compatibility but should not be primary method
    if (!foundPro && !foundPremium) {
      const proProductId = process.env.PRO_PRODUCT_ID;
      const premiumProductId = process.env.PREMIUM_PRODUCT_ID;
      
      if (proProductId) {
        try {
          const proAccess = await whopsdk.users.checkAccess(proProductId, { id: userId });
          if (proAccess.has_access && proAccess.access_level === "customer") {
            foundPro = true;
          }
        } catch (proError) {
          console.log("Pro Product ID check failed:", proError);
        }
      }

      if (!foundPro && premiumProductId) {
        try {
          const premiumAccess = await whopsdk.users.checkAccess(premiumProductId, { id: userId });
          if (premiumAccess.has_access && premiumAccess.access_level === "customer") {
            foundPremium = true;
          }
        } catch (premiumError) {
          console.log("Premium Product ID check failed:", premiumError);
        }
      }
    }

    // Return highest tier found
    if (foundPro) return "pro";
    if (foundPremium) return "premium";
    return "free";
  } catch (error) {
    console.error("Error checking user plan:", error);
    // On error, default to free
    return "free";
  }
}



