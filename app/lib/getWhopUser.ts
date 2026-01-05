import { headers } from "next/headers";
import { whopsdk } from "./whop-sdk";

/**
 * Shared server-side utility for Whop user ownership detection
 * 
 * Ownership is enforced server-side to avoid iframe routing inconsistencies in Whop.
 * 
 * This function:
 * - Reads token from headers (x-whop-user-token, x-whop-token, authorization)
 * - Uses Whop SDK to verify token and retrieve user information
 * - Checks company role from authorized users
 * - Returns isOwner === true ONLY if role is "owner" or "admin"
 * - On error or uncertainty → isOwner = false (fail-secure)
 * 
 * @returns {Promise<{isOwner: boolean, role: "owner" | "admin" | "member"}>}
 */
export async function getWhopUser(): Promise<{
  isOwner: boolean;
  role: "owner" | "admin" | "member";
}> {
  try {
    const headersList = await headers();
    
    // Get token from headers (Whop passes this when loading in iframe)
    const token = 
      headersList.get("x-whop-user-token") || 
      headersList.get("x-whop-token") || 
      headersList.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      // No token = member (cannot access owner functionality)
      return {
        isOwner: false,
        role: "member",
      };
    }

    // Verify user token with Whop SDK
    const { userId } = await whopsdk.verifyUserToken(token);
    
    if (!userId) {
      // Invalid token = member (cannot access owner functionality)
      return {
        isOwner: false,
        role: "member",
      };
    }

    // Try to detect if user is owner/admin by checking company role
    // In Whop, when previewing as another role, the user should not be considered owner
    try {
      // Use Whop SDK to retrieve user information
      const user = await whopsdk.users.retrieve(userId);
      
      // Check user's company role - valid owner roles: "owner" or "admin"
      // The exact property name may vary - check common properties
      const userObj = user as any;
      const userRole = 
        userObj?.company_role || 
        userObj?.role || 
        userObj?.user_role || 
        userObj?.companyRole || 
        userObj?.userRole || 
        null;
      
      // Ownership logic: isOwner === true only if role is "owner" or "admin"
      // This ensures preview mode as another role doesn't grant owner access
      const isOwner = userRole === "owner" || userRole === "admin";
      
      const role: "owner" | "admin" | "member" = isOwner 
        ? (userRole === "admin" ? "admin" : "owner") 
        : "member";
      
      return {
        isOwner,
        role,
      };
    } catch (userError) {
      console.error("Error fetching user role:", userError);
      // On error, default to member (fail-secure - don't grant owner access on error)
      return {
        isOwner: false,
        role: "member",
      };
    }
  } catch (error) {
    console.error("Error in getWhopUser:", error);
    // On error, default to member (secure default - cannot access owner functionality)
    return {
      isOwner: false,
      role: "member",
    };
  }
}


