import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/app/lib/whop-sdk";
import { getUserPlan } from "@/app/lib/getUserPlan";
import { getPlanPermissions } from "@/app/lib/getPlanPermissions";

export async function GET(request: NextRequest) {
  try {
    // Get Whop token from headers
    const token = request.headers.get("x-whop-token") || request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!token) {
      // No token = free plan
      const permissions = getPlanPermissions("free");
      return NextResponse.json({ 
        plan: "free", 
        permissions,
        userId: null 
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
        userId: null 
      });
    }

    // Get user's plan from Whop
    const plan = await getUserPlan(userId);
    const permissions = getPlanPermissions(plan);

    return NextResponse.json({ 
      plan, 
      permissions,
      userId 
    });
  } catch (error) {
    console.error("Error verifying Whop user:", error);
    // On error, default to free
    const permissions = getPlanPermissions("free");
    return NextResponse.json({ 
      plan: "free", 
      permissions,
      userId: null 
    });
  }
}

