/**
 * Discover Page
 * 
 * Public-facing page for the Upgrade app.
 * Works in Whop App Store and directly in browser.
 */
export default function DiscoverPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Upgrade</h1>
        
        <p className="mb-8 text-lg">
          Increase plan upgrades inside your Whop with a conversion-optimized upgrade experience.
        </p>
        
        <ul className="list-disc list-inside mb-8 space-y-2">
          <li>Compare plans clearly</li>
          <li>Drive higher upgrade conversions</li>
          <li>Zero setup for creators</li>
        </ul>
        
        <p className="text-sm opacity-70">Install the app to get started.</p>
      </div>
    </div>
  );
}

