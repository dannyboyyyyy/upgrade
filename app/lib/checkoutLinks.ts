/**
 * Checkout Links - Single Source of Truth
 * 
 * CRITICAL: This is the ONLY place where checkout URLs are defined.
 * All checkout redirects must use getCheckoutLink() from this file.
 * 
 * Rules:
 * - Pro plan → ALWAYS uses Pro checkout URL
 * - Premium plan → ALWAYS uses Premium checkout URL
 * - Monthly/yearly toggle does NOT affect checkout URL
 * - Plan type is the ONLY factor determining checkout URL
 */

export const CHECKOUT_LINKS = {
  pro: "https://whop.com/api-app-v-yf-ddcqkc-oa-ya-1-pro/",
  premium: "https://whop.com/api-app-v-yf-ddcqkc-oa-ya-1-premium/",
} as const;

/**
 * Get checkout link for a plan
 * 
 * @param plan - "pro" | "premium"
 * @returns Checkout URL for the plan
 * @throws Error if plan is invalid
 */
export function getCheckoutLink(plan: "pro" | "premium"): string {
  if (plan === "pro") {
    return CHECKOUT_LINKS.pro;
  }
  if (plan === "premium") {
    return CHECKOUT_LINKS.premium;
  }
  throw new Error(`Invalid plan: ${plan}. Must be "pro" or "premium"`);
}

