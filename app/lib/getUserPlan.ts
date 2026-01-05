import { whopsdk } from "./whop-sdk";

export async function getUserPlan(userId: string): Promise<"free" | "premium" | "pro"> {
  try {
    const proAccess = await whopsdk.users.checkAccess(
      process.env.PRO_PRODUCT_ID!,
      { id: userId }
    );

    const premiumAccess = await whopsdk.users.checkAccess(
      process.env.PREMIUM_PRODUCT_ID!,
      { id: userId }
    );

    const isPro =
      proAccess.has_access && proAccess.access_level === "customer";

    const isPremium =
      premiumAccess.has_access && premiumAccess.access_level === "customer";

    if (isPro) return "pro";
    if (isPremium) return "premium";
    return "free";
  } catch (error) {
    console.error("Error checking user plan:", error);
    // On error, default to free
    return "free";
  }
}


