import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for Whop app
 * 
 * IMPORTANT: No redirects - Whop controls routing.
 * This middleware only logs or adds headers if needed.
 * The pages themselves handle missing Whop context gracefully.
 */
export function middleware(request: NextRequest) {
  // No redirects - let Whop handle routing
  // Pages will show appropriate UI if Whop context is missing
  
  return NextResponse.next();
}

export const config = {
  matcher: "/owner/:path*",
};
