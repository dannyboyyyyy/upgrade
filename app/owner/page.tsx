import OwnerPageClient from "./OwnerPageClient";

export const dynamic = "force-dynamic";

/**
 * Owner Page - For Owners
 * 
 * Whop automatically routes owners to /owner via dashboard_path.
 * This page renders the owner configuration UI.
 * 
 * No redirects - Whop handles routing. If accessed without Whop context,
 * OwnerPageClient will handle the UI appropriately.
 */
export default async function OwnerPage() {
  // Render owner dashboard directly - no redirects
  // Whop controls routing, not the app
  return <OwnerPageClient />;
}
