import { NextResponse } from "next/server";
import { whopsdk } from "@/app/lib/whop-sdk";

export async function GET() {
  try {
    // Fetch all products from Whop
    const products = await whopsdk.products.listAll();
    
    // Map products to our plan structure
    const planData: {
      PRO_MONTHLY_PLAN_ID?: string;
      PRO_YEARLY_PLAN_ID?: string;
      PREMIUM_MONTHLY_PLAN_ID?: string;
      PREMIUM_YEARLY_PLAN_ID?: string;
      PRO_MONTHLY_PURCHASE_URL?: string;
      PRO_YEARLY_PURCHASE_URL?: string;
      PREMIUM_MONTHLY_PURCHASE_URL?: string;
      PREMIUM_YEARLY_PURCHASE_URL?: string;
    } = {};

    // Process each product
    for (const product of products.data || []) {
      const name = product.name?.toLowerCase() || "";
      const billingPeriod = product.billing_period?.toLowerCase() || "";
      const productId = product.id;
      const checkoutUrl = product.checkout_url;

      // Match Pro products
      if (name.includes("pro")) {
        if (billingPeriod === "month" || billingPeriod === "monthly") {
          planData.PRO_MONTHLY_PLAN_ID = productId;
          if (checkoutUrl) planData.PRO_MONTHLY_PURCHASE_URL = checkoutUrl;
        } else if (billingPeriod === "year" || billingPeriod === "yearly") {
          planData.PRO_YEARLY_PLAN_ID = productId;
          if (checkoutUrl) planData.PRO_YEARLY_PURCHASE_URL = checkoutUrl;
        }
      }

      // Match Premium products
      if (name.includes("premium")) {
        if (billingPeriod === "month" || billingPeriod === "monthly") {
          planData.PREMIUM_MONTHLY_PLAN_ID = productId;
          if (checkoutUrl) planData.PREMIUM_MONTHLY_PURCHASE_URL = checkoutUrl;
        } else if (billingPeriod === "year" || billingPeriod === "yearly") {
          planData.PREMIUM_YEARLY_PLAN_ID = productId;
          if (checkoutUrl) planData.PREMIUM_YEARLY_PURCHASE_URL = checkoutUrl;
        }
      }
    }

    return NextResponse.json(planData);
  } catch (error) {
    console.error("Error fetching Whop products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products from Whop" },
      { status: 500 }
    );
  }
}

