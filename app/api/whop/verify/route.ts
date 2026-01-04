import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/app/lib/whop-sdk";
import { getUserPlan } from "@/app/lib/getUserPlan";
import { getPlanPermissions } from "@/app/lib/getPlanPermissions";

export async function GET(request: NextRequest) {
  try {
    // Get Whop token from headers (support both x-whop-token and x-whop-user-token)
    const token = 
      request.headers.get("x-whop-user-token") || 
      request.headers.get("x-whop-token") || 
      request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!token) {
      // No token = free plan
      const permissions = getPlanPermissions("free");
      return NextResponse.json({ 
        plan: "free", 
        permissions,
        userId: null,
        isOwner: false
      });
    }

    // Verify user token with Whop
    const { userId } = await whopsdk.verifyUserToken(token);
    
    if (!userId) {
      // Invalid token = free plan
      const permissions = getPlanPermissions("free");
      return NextResponse.json({ 
        plan: "free", 
        permissions,
        userId: null,
        isOwner: false
      });
    }

    // Get user's plan from Whop
    const plan = await getUserPlan(userId);
    const permissions = getPlanPermissions(plan);

    // Check if user is owner (has access to manage the app)
    // In Whop, owners are typically those who have installed the app or have admin access
    // For now, we'll check if they have Pro or Premium access as a proxy for owner status
    // This can be refined based on your specific Whop app configuration
    const isOwner = plan === "pro" || plan === "premium" || plan === "free"; // All authenticated users can access owner page for now

    return NextResponse.json({ 
      plan, 
      permissions,
      userId,
      isOwner
    });
  } catch (error) {
    console.error("Error verifying Whop user:", error);
    // On error, default to free
    const permissions = getPlanPermissions("free");
    return NextResponse.json({ 
      plan: "free", 
      permissions,
      userId: null,
      isOwner: false
    });
  }
}

