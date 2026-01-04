import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for protecting owner routes
 * Owner access, features, and limits are enforced exclusively by Whop ownership + active subscription.
 */
export function middleware(request: NextRequest) {
  // Only protect /owner routes
  if (request.nextUrl.pathname.startsWith("/owner")) {
    // Get Whop token from headers
    const token = 
      request.headers.get("x-whop-user-token") || 
      request.headers.get("x-whop-token") || 
      request.headers.get("authorization")?.replace("Bearer ", "");
    
    // If no token, redirect to upgrade (non-owner)
    if (!token) {
      return NextResponse.redirect(new URL("/upgrade", request.url));
    }
    
    // Note: Full owner validation happens in the owner page via API call
    // This middleware provides basic token check, but full validation
    // must be done server-side in the owner page component or API route
    // to ensure Whop SDK validation occurs
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/owner/:path*",
};

