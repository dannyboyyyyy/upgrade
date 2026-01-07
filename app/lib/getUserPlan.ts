import { whopsdk } from "./whop-sdk";

/**
 * Get user's plan by checking successful payments (Orders) from Whop Payments API
 * 
 * CRITICAL: Permissions are tied to the USER's account (userId), not to a specific Whop company.
 * If a user purchases Premium/Pro, they should have access in ALL Whop companies they use.
 * 
 * This function uses Whop Payments (Orders) as the single source of truth:
 * 1. Fetches orders from Whop API scoped to the Upgrade Whop
 * 2. Filters orders by:
 *    - order.user_id === userId
 *    - order.status === "succeeded"
 *    - order.product_id matches PRO_PRODUCT_ID or PREMIUM_PRODUCT_ID
 * 3. Returns highest tier found (Pro > Premium > Free)
 * 
 * Whop API endpoints used:
 * - whopsdk.orders.list() - Fetches orders/payments from Whop Payments
 */
export async function getUserPlan(userId: string): Promise<"free" | "premium" | "pro"> {
  try {
    const proProductId = process.env.PRO_PRODUCT_ID;
    const premiumProductId = process.env.PREMIUM_PRODUCT_ID;

    // Validate that Product IDs are configured
    if (!proProductId || !premiumProductId) {
      console.warn("[getUserPlan] PRO_PRODUCT_ID or PREMIUM_PRODUCT_ID not configured in environment variables");
      return "free";
    }

    // Log configuration
    console.log("[getUserPlan] Checking plan for user:", {
      userId,
      proProductId,
      premiumProductId,
    });

    let foundProPayment = false;
    let foundPremiumPayment = false;

    // PRIMARY METHOD: Fetch orders/payments from Whop Payments API
    try {
      // Fetch orders from Whop API
      // Note: This fetches orders scoped to the Upgrade Whop (via WHOP_APP_ID)
      const ordersResponse = await (whopsdk as any).orders?.list({ 
        user_id: userId,
        status: "succeeded",
      }) || { data: [] };

      const orders = ordersResponse.data || [];
      
      // Log fetched orders for debugging
      console.log(`[getUserPlan] Fetched ${orders.length} succeeded orders for user ${userId}`);

      // Filter and check each order
      for (const order of orders) {
        const orderProductId = order.product_id || order.product?.id;
        const orderStatus = order.status;
        const orderUserId = order.user_id || order.user?.id;

        // Log each order for debugging
        console.log(`[getUserPlan] Checking order:`, {
          orderId: order.id,
          orderProductId,
          orderStatus,
          orderUserId,
          matchesUserId: orderUserId === userId,
        });

        // Filter: Must match userId, status must be "succeeded", and have product_id
        if (orderUserId !== userId) {
          continue;
        }

        if (orderStatus !== "succeeded") {
          continue;
        }

        if (!orderProductId) {
          continue;
        }

        // Check if order is for Pro product
        if (orderProductId === proProductId) {
          foundProPayment = true;
          console.log(`[getUserPlan] ✅ Found succeeded Pro payment for user ${userId}, order: ${order.id}`);
        }

        // Check if order is for Premium product
        if (orderProductId === premiumProductId) {
          foundPremiumPayment = true;
          console.log(`[getUserPlan] ✅ Found succeeded Premium payment for user ${userId}, order: ${order.id}`);
        }
      }

      // Log matched product IDs
      if (foundProPayment || foundPremiumPayment) {
        console.log(`[getUserPlan] Matched payments:`, {
          userId,
          foundProPayment,
          foundPremiumPayment,
          proProductId: foundProPayment ? proProductId : null,
          premiumProductId: foundPremiumPayment ? premiumProductId : null,
        });
      }

    } catch (ordersError: any) {
      // If orders API fails, log error
      console.error("[getUserPlan] Error fetching orders from Whop API:", {
        error: ordersError?.message || ordersError,
        errorStack: ordersError?.stack,
        userId,
        proProductId,
        premiumProductId,
      });
      
      // Return free on error (safe default)
      return "free";
    }

    // Resolve plan: Pro takes precedence over Premium
    let resolvedPlan: "free" | "premium" | "pro" = "free";
    
    if (foundProPayment) {
      resolvedPlan = "pro";
    } else if (foundPremiumPayment) {
      resolvedPlan = "premium";
    }

    // Log resolved plan
    console.log(`[getUserPlan] ✅ Resolved plan for user ${userId}:`, {
      plan: resolvedPlan,
      foundProPayment,
      foundPremiumPayment,
    });

    return resolvedPlan;
  } catch (error: any) {
    console.error("[getUserPlan] Unexpected error checking user plan:", {
      error: error?.message || error,
      errorStack: error?.stack,
      userId,
    });
    // On error, default to free (safe default)
    return "free";
  }
}



