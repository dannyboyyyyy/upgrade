import { headers } from "next/headers";
import { whopsdk } from "./whop-sdk";

/**
 * Get company_id from Whop context (SERVER-SIDE ONLY)
 * 
 * This function retrieves the company_id from Whop context, which is the
 * unique identifier for each Whop company/creator. This is the primary
 * tenant identifier for multi-tenant data isolation.
 * 
 * Priority order:
 * 1. x-whop-company-id header (direct from Whop)
 * 2. x-whop-experience-id header (experience_id can serve as tenant identifier)
 * 3. User object company_id
 * 4. userId as fallback (ensures app works even if company_id unavailable)
 * 
 * @returns {Promise<string | null>} Company ID or null if not available
 */
export async function getWhopCompanyId(): Promise<string | null> {
  try {
    const headersList = await headers();
    
    // Priority 1: Check for company_id in headers (most direct)
    const companyIdFromHeader = 
      headersList.get("x-whop-company-id") ||
      headersList.get("whop-company-id");
    
    if (companyIdFromHeader) {
      return companyIdFromHeader;
    }

    // Priority 2: Check for experience_id in headers (can serve as tenant identifier)
    const experienceId = 
      headersList.get("x-whop-experience-id") ||
      headersList.get("whop-experience-id");
    
    if (experienceId) {
      return experienceId;
    }

    // Get token from headers (Whop passes this when loading in iframe)
    const token = 
      headersList.get("x-whop-user-token") || 
      headersList.get("x-whop-token") || 
      headersList.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      // Log available headers for debugging
      console.log("No token found. Available Whop headers:", {
        "x-whop-user-token": headersList.get("x-whop-user-token") ? "present" : "missing",
        "x-whop-token": headersList.get("x-whop-token") ? "present" : "missing",
        "authorization": headersList.get("authorization") ? "present" : "missing",
      });
      return null;
    }

    // Verify user token with Whop SDK
    const { userId } = await whopsdk.verifyUserToken(token);
    
    if (!userId) {
      console.log("Token verification failed - no userId returned");
      return null;
    }

    // Priority 3: Get user information from Whop API
    try {
      const user = await whopsdk.users.retrieve(userId);
      
      // Check for company_id in various possible locations
      const userObj = user as any;
      const companyIdFromUser = 
        userObj?.company_id || 
        userObj?.companyId || 
        userObj?.company?.id ||
        userObj?.experience_id ||
        userObj?.experienceId ||
        null;
      
      if (companyIdFromUser) {
        return companyIdFromUser as string;
      }

      // Log user object structure for debugging
      console.log("User object keys:", Object.keys(userObj || {}));
      console.log("User object sample:", JSON.stringify(userObj, null, 2).substring(0, 500));

      // Priority 4: Fallback to userId as tenant identifier
      // This ensures the app works even if company_id is not available
      // Each user will have isolated data based on their userId
      // NOTE: This is a fallback and not ideal for true multi-tenant isolation
      // but ensures the app functions correctly
      console.warn("Company ID not found in user object or headers, using userId as fallback:", userId);
      return userId;
    } catch (userError) {
      console.error("Error fetching user company_id:", userError);
      // Even on error, if we have userId, use it as fallback
      return userId;
    }
  } catch (error) {
    console.error("Error in getWhopCompanyId:", error);
    return null;
  }
}

