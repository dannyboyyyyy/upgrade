import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/app/lib/whop-sdk";
import { getUserPlan } from "@/app/lib/getUserPlan";

/**
 * Get current user's role and plan information
 * Used for role-based routing and access control
 * 
 * Returns:
 * - role: "owner" | "member"
 * - plan: "free" | "premium" | "pro"
 * - userId: Whop user ID if authenticated
 */
export async function GET(request: NextRequest) {
  try {
    // Get Whop token from headers
    const token = 
      request.headers.get("x-whop-user-token") || 
      request.headers.get("x-whop-token") || 
      request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!token) {
      // No token = member (free tier)
      return NextResponse.json({ 
        role: "member",
        plan: "free",
        userId: null
      });
    }

    // Verify user token with Whop
    const { userId } = await whopsdk.verifyUserToken(token);
    
    if (!userId) {
      // Invalid token = member (free tier)
      return NextResponse.json({ 
        role: "member",
        plan: "free",
        userId: null
      });
    }

    // Get user's plan from Whop
    const plan = await getUserPlan(userId);
    
    // In Whop, users who access via dashboard context are owners
    // For this app, all authenticated users with valid tokens are considered owners
    // Members are unauthenticated users (free tier)
    // This can be refined based on your specific Whop app configuration
    
    return NextResponse.json({ 
      role: "owner",
      plan,
      userId
    });
  } catch (error) {
    console.error("Error getting user info:", error);
    // On error, default to member (free tier)
    return NextResponse.json({ 
      role: "member",
      plan: "free",
      userId: null
    });
  }
}

