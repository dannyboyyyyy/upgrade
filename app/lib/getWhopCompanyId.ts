import { headers } from "next/headers";
import { whopsdk } from "./whop-sdk";

/**
 * Get company_id from Whop context (SERVER-SIDE ONLY)
 * 
 * This function retrieves the company_id from Whop context, which is the
 * unique identifier for each Whop company/creator. This is the primary
 * tenant identifier for multi-tenant data isolation.
 * 
 * @returns {Promise<string | null>} Company ID or null if not available
 */
export async function getWhopCompanyId(): Promise<string | null> {
  try {
    const headersList = await headers();
    
    // Get token from headers (Whop passes this when loading in iframe)
    const token = 
      headersList.get("x-whop-user-token") || 
      headersList.get("x-whop-token") || 
      headersList.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return null;
    }

    // Verify user token with Whop SDK
    const { userId } = await whopsdk.verifyUserToken(token);
    
    if (!userId) {
      return null;
    }

    // Get user information from Whop API
    // The user object should contain company_id
    try {
      const user = await whopsdk.users.retrieve(userId);
      
      // Check for company_id in various possible locations
      const userObj = user as any;
      const companyId = 
        userObj?.company_id || 
        userObj?.companyId || 
        userObj?.company?.id ||
        headersList.get("x-whop-company-id") || // Check headers as fallback
        null;
      
      if (!companyId) {
        console.error("Company ID not found in user object or headers");
        return null;
      }
      
      return companyId as string;
    } catch (userError) {
      console.error("Error fetching user company_id:", userError);
      return null;
    }
  } catch (error) {
    console.error("Error in getWhopCompanyId:", error);
    return null;
  }
}

