import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/app/lib/whop-sdk";

/**
 * Get current user's role and ownership status
 * Used for role-based routing and access control
 * 
 * Members only ever access /upgrade
 * Owners control app configuration via /owner
 * App plan permissions apply exclusively to owners
 * 
 * Returns:
 * - isOwner: boolean (true if user has "owner" or "admin" company role)
 * - role: "owner" | "admin" | "member"
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
      // No token = member (cannot access owner functionality)
      return NextResponse.json({ 
        isOwner: false,
        role: "member",
        userId: null
      });
    }

    // Verify user token with Whop
    const { userId } = await whopsdk.verifyUserToken(token);
    
    if (!userId) {
      // Invalid token = member (cannot access owner functionality)
      return NextResponse.json({ 
        isOwner: false,
        role: "member",
        userId: null
      });
    }

    // Get user's company role from Whop API
    // Check if user has "owner" or "admin" role in their company
    try {
      // Use Whop SDK to retrieve user information
      // The user object contains role information that indicates ownership
      const user = await whopsdk.users.retrieve(userId);
      
      // Check user's role - valid owner roles: "owner" or "admin"
      // Members have no company role or different role (e.g., "member", "customer")
      // The exact property name may vary - check common properties
      const userRole = (user as any)?.company_role || (user as any)?.role || (user as any)?.user_role || null;
      const isOwner = userRole === "owner" || userRole === "admin";
      const role: "owner" | "admin" | "member" = isOwner 
        ? (userRole === "admin" ? "admin" : "owner") 
        : "member";
      
      return NextResponse.json({ 
        isOwner,
        role,
        userId
      });
    } catch (userError) {
      console.error("Error fetching user role:", userError);
      // If we can't determine role, default to member (secure default)
      // Members must never access owner functionality
      return NextResponse.json({ 
        isOwner: false,
        role: "member",
        userId
      });
    }
  } catch (error) {
    console.error("Error getting user info:", error);
    // On error, default to member (secure default - cannot access owner functionality)
    return NextResponse.json({ 
      isOwner: false,
      role: "member",
      userId: null
    });
  }
}

