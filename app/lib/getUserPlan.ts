import { whopsdk } from "./whop-sdk";

export async function getUserPlan(userId: string): Promise<"free" | "premium" | "pro"> {
  const result = await (whopsdk.users as any).listSubscriptions({ id: userId });

  const active = result?.subscriptions?.filter(
    (s: any) => s.status === "active"
  );

  console.log("SUBSCRIPTIONS DEBUG", {
    userId,
    active: active?.map((s: any) => ({
      product_id: s.product_id,
      status: s.status,
    })),
  });

  if (!active || active.length === 0) {
    return "free";
  }

  if (
    active.some(
      (s: any) => s.product_id === process.env.PREMIUM_PLAN_ID
    )
  ) {
    return "premium";
  }

  if (
    active.some(
      (s: any) => s.product_id === process.env.PRO_PLAN_ID
    )
  ) {
    return "pro";
  }

  return "free";
}



