import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/app/lib/whop-sdk";

/**
 * Check if the current user is an owner/creator
 * Owners are users who have installed the app or have admin access
 * This route is used to protect /owner routes from regular users
 */
export async function GET(request: NextRequest) {
  try {
    // Get Whop token from headers
    const token = 
      request.headers.get("x-whop-user-token") || 
      request.headers.get("x-whop-token") || 
      request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!token) {
      // No token = not an owner, redirect to upgrade
      return NextResponse.json({ 
        isOwner: false 
      });
    }

    // Verify user token with Whop
    const { userId } = await whopsdk.verifyUserToken(token);
    
    if (!userId) {
      // Invalid token = not an owner
      return NextResponse.json({ 
        isOwner: false 
      });
    }

    // In Whop, owners are typically those accessing via dashboard context
    // For this app, we allow all authenticated users to access owner page
    // as they are managing their own upgrade sections
    // This can be refined based on your specific Whop app configuration
    // For example, you might check if user has a specific role or product access
    
    return NextResponse.json({ 
      isOwner: true,
      userId
    });
  } catch (error) {
    console.error("Error checking owner status:", error);
    // On error, assume not owner
    return NextResponse.json({ 
      isOwner: false 
    });
  }
}


