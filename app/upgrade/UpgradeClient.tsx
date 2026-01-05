"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { getEnv } from "../lib/env";
import { OwnerConfigModal } from "./OwnerConfigModal";

// Environment variables for checkout URLs (loaded at module level)
const PREMIUM_MONTHLY_PURCHASE_URL = getEnv("NEXT_PUBLIC_PREMIUM_MONTHLY_PURCHASE_URL");
const PREMIUM_YEARLY_PURCHASE_URL = getEnv("NEXT_PUBLIC_PREMIUM_YEARLY_PURCHASE_URL");
const PRO_MONTHLY_PURCHASE_URL = getEnv("NEXT_PUBLIC_PRO_MONTHLY_PURCHASE_URL");
const PRO_YEARLY_PURCHASE_URL = getEnv("NEXT_PUBLIC_PRO_YEARLY_PURCHASE_URL");

type UpgradeOption = {
  title: string;
  plan_description: string;
  monthly_price: number;
  yearly_price: number;
  monthly_checkout_url: string;
  yearly_checkout_url: string;
  description: string[];
  is_featured?: boolean;
};

type BrandSettings = {
  logo_url: string;
  brand_color: string;
};

const OWNER_ID = "whop-app";

interface UpgradeClientProps {
  initialIsOwner: boolean;
  initialPlan: "free" | "premium" | "pro";
  initialPermissions: {
    showUpgradeBranding: boolean;
  };
}

export function UpgradeClient({ initialIsOwner, initialPlan, initialPermissions }: UpgradeClientProps) {
  const [plans, setPlans] = useState<UpgradeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    logo_url: "",
    brand_color: "#ff7a00",
  });
  const [plan, setPlan] = useState<"free" | "premium" | "pro">(initialPlan);
  const [permissions, setPermissions] = useState<{
    showUpgradeBranding: boolean;
  }>(initialPermissions);
  const [isOwner, setIsOwner] = useState(initialIsOwner);
  const [isYearly, setIsYearly] = useState(false);
  const [showOwnerConfig, setShowOwnerConfig] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Debug: Log initial owner status
  console.log("[UpgradeClient] Initial isOwner:", initialIsOwner);

  // Refresh ownership status periodically (in case it changes)
  useEffect(() => {
    const verifyWhopUser = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const whopToken = urlParams.get("token") || localStorage.getItem("whop_token");
        
        // Store token for future use
        if (whopToken && !localStorage.getItem("whop_token")) {
          localStorage.setItem("whop_token", whopToken);
        }
        
        // Fetch ownership status from /api/whop/me
        // Determine ownership STRICTLY from company role (server-side only)
        const ownerResponse = await fetch("/api/whop/me", {
          headers: {
            "x-whop-user-token": whopToken || "",
            "x-whop-token": whopToken || "",
          },
        });
        
        if (ownerResponse.ok) {
          const ownerData = await ownerResponse.json();
          // Update ownership status ONLY if isOwner === true (strict check)
          const newIsOwner = ownerData.isOwner === true;
          console.log("[Client] Owner check result:", { isOwner: newIsOwner, role: ownerData.role, initialIsOwner });
          // Only update if we got a definitive answer, don't override server-side true with false
          if (newIsOwner === true || initialIsOwner === false) {
            setIsOwner(newIsOwner);
          }
        } else {
          // Request failed - don't override server-side ownership check
          // Only set to false if we started with false
          console.log("[Client] Owner API request failed:", ownerResponse.status, "keeping initialIsOwner:", initialIsOwner);
          if (initialIsOwner === false) {
            setIsOwner(false);
          }
        }
        
        // Get plan and permissions
        const response = await fetch("/api/whop/verify", {
          headers: {
            "x-whop-user-token": whopToken || "",
            "x-whop-token": whopToken || "",
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setPlan(data.plan);
          setPermissions({ showUpgradeBranding: data.permissions.showUpgradeBranding });
        }
      } catch (err) {
        console.error("Error verifying Whop user:", err);
        setIsOwner(false);
      }
    };
    
    verifyWhopUser();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
      const { data, error } = await supabase
        .from("upgrade_sections")
          .select("*")
        .eq("owner_id", OWNER_ID)
        .single();

        if (error) {
          console.error("Supabase error:", error);
          setError(error.message);
        } else if (data) {
          // Load upgrades
          if (data.upgrades && Array.isArray(data.upgrades)) {
            console.log("Raw upgrades data:", data.upgrades);
            let transformedPlans = data.upgrades
              .filter((plan: any) => plan && plan.title && plan.title.trim() !== "")
              .map((plan: any) => ({
                title: plan.title || "",
                plan_description: plan.plan_description || "",
                monthly_price: plan.monthly_price || plan.price || 0,
                yearly_price: plan.yearly_price || 0,
                monthly_checkout_url: plan.monthly_checkout_url || plan.checkout_url || "",
                yearly_checkout_url: plan.yearly_checkout_url || "",
                description: plan.description || [],
                is_featured: plan.is_featured || false,
              }));
            
            // Sort plans: if exactly 3 plans and one is featured, put featured in middle
            if (transformedPlans.length === 3) {
              const featuredIndex = transformedPlans.findIndex((p: UpgradeOption) => p.is_featured);
              if (featuredIndex !== -1) {
                // Move featured plan to middle (index 1)
                const featured = transformedPlans[featuredIndex];
                const others = transformedPlans.filter((_: UpgradeOption, i: number) => i !== featuredIndex);
                transformedPlans = [others[0], featured, others[1]];
              }
            }
            
            console.log("Transformed plans:", transformedPlans);
            setPlans(transformedPlans);
          } else {
            console.log("No upgrades data or not an array:", data.upgrades);
          }
          // Load brand settings
          if (data.brand_settings) {
            const loadedColor = data.brand_settings.brand_color || data.brand_settings.primary_color;
            setBrandSettings({
              logo_url: data.brand_settings.logo_url || "",
              brand_color: loadedColor || "#ff7a00",
            });
          } else {
            // If no brand_settings exist, use default
            setBrandSettings({
              logo_url: "",
              brand_color: "#ff7a00",
            });
          }
        }
      } catch (err) {
        console.error("Error loading plans:", err);
        setError(err instanceof Error ? err.message : "Failed to load plans");
      } finally {
      setLoading(false);
      }
    };

    load();
  }, []);

  // Separate effect for polling brand settings updates
  useEffect(() => {
    // Poll for brand settings updates every 2 seconds (only check brand settings, not plans)
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from("upgrade_sections")
          .select("brand_settings")
          .eq("owner_id", OWNER_ID)
          .single();

        if (!error && data?.brand_settings) {
          const newBrandColor = data.brand_settings.brand_color || data.brand_settings.primary_color;
          const newLogoUrl = data.brand_settings.logo_url || "";
          
          // Only update if brand settings have changed
          setBrandSettings((prev) => {
            const finalColor = newBrandColor || "#ff7a00";
            if (prev.brand_color !== finalColor || prev.logo_url !== newLogoUrl) {
              return {
                logo_url: newLogoUrl,
                brand_color: finalColor,
              };
            }
            return prev;
          });
        }
      } catch (err) {
        // Silently fail - don't spam console
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div style={{ color: "#fff", padding: 40 }}>Loading…</div>;
  }

  if (error) {
    return (
      <div style={{ color: "#fff", padding: 40, textAlign: "center" }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  // Create gradient background
  const gradientBackground = `linear-gradient(135deg, #0b0b0b 0%, #1a1a1a 50%, #0b0b0b 100%)`;

  return (
    <div style={{ ...styles.page, background: gradientBackground }}>
      <style>{`
        [data-grid]::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div style={styles.container}>
        {/* Owner Configuration Button: Only visible to owners, opens inline configuration modal */}
        {/* Plan configuration is rendered inline on /upgrade to avoid routing issues caused by Whop iframe mounting */}
        {/* Members must NEVER see this button or any configuration UI */}
        {isOwner === true && (
          <div style={{ 
            position: "absolute", 
            top: 20, 
            right: 20,
            zIndex: 1000
          }}>
            <button
              onClick={() => {
                console.log("[Button] Configure Plans clicked, opening modal");
                setShowOwnerConfig(true);
              }}
              style={{
                display: "inline-block",
                padding: "12px 24px",
                background: brandSettings.brand_color,
                color: "#fff",
                textDecoration: "none",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                transition: "opacity 0.2s",
                border: `1px solid ${brandSettings.brand_color}40`,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              Configure Plans
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginBottom: 8 }}>
          {brandSettings.logo_url && (
            <img
              src={brandSettings.logo_url}
              alt="Logo"
              style={{
                ...styles.logo,
                filter: `drop-shadow(0 4px 12px ${brandSettings.brand_color}66)`,
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>

        <p style={styles.subtitle}>{permissions.showUpgradeBranding ? "Upgrade Your Account" : "Current Plan"}</p>
        <h1 style={styles.title}>Choose a right plan for you</h1>

        <div style={styles.toggleContainer}>
          <label style={styles.toggleSwitch}>
            <input
              type="checkbox"
              checked={isYearly}
              onChange={(e) => setIsYearly(e.target.checked)}
              style={{ display: "none" }}
            />
            <span style={styles.toggleSlider}>
              <span
                style={{
                  position: "absolute",
                  left: isYearly ? "50%" : 0,
                  top: 0,
                  width: "50%",
                  height: "100%",
                  background: brandSettings.brand_color,
                  borderRadius: 12,
                  transition: "left 0.3s",
                  zIndex: 1,
                }}
              />
              <span
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "flex",
                  width: "100%",
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "space-around",
                }}
              >
                <span
                  style={{
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    transition: "opacity 0.3s",
                    opacity: isYearly ? 0.6 : 1,
                  }}
                >
                  Monthly
                </span>
                <span
                  style={{
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    transition: "opacity 0.3s",
                    opacity: isYearly ? 1 : 0.6,
                  }}
                >
                  Yearly
                </span>
              </span>
            </span>
          </label>
        </div>

        <div style={styles.gridContainer}>
          <div
            style={{
              ...styles.grid,
              overflowX: plans.length > 3 ? "auto" : "visible",
              flexWrap: plans.length <= 3 ? "wrap" : "nowrap",
              justifyContent: plans.some(p => p.is_featured) ? "center" : "center",
              alignItems: "stretch", // Make all cards same height
            }}
            ref={gridRef}
            data-grid
          >
            {plans.map((plan, i) => {
              // Always lift featured plan slightly, regardless of count
              // Non-featured plans stay at same height
              const isFeatured = plan.is_featured;
              return (
              <div
                key={i}
                style={{
                  ...styles.card,
                  ...(isFeatured ? styles.featuredCard : {}),
                }}
              >
              {plan.is_featured && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "66%",
                      background: `linear-gradient(to top, ${brandSettings.brand_color}40, ${brandSettings.brand_color}00)`,
                      pointerEvents: "none",
                      zIndex: 0,
                    }}
                  />
                  <div style={{ ...styles.badge, position: "relative", zIndex: 2 }}>Best value for money!</div>
                </>
              )}
              <div style={{ position: "relative", zIndex: 1 }}>
                <h2 style={styles.cardTitle}>{plan.title}</h2>
              {plan.plan_description && (
                <p style={styles.planDescription}>{plan.plan_description}</p>
              )}
              <div style={styles.priceContainer}>
                <span style={{ ...styles.price, color: brandSettings.brand_color }}>
                  ${isYearly ? plan.yearly_price : plan.monthly_price}
                </span>
                <span style={styles.priceUnit}>
                  /{isYearly ? "Year" : "Month"}
                </span>
              </div>
              {plan.description.length > 0 && (
                <div style={styles.featuresSection}>
                  <h3 style={styles.featuresTitle}>What You Get</h3>
                  <ul style={styles.descriptionList}>
                    {plan.description.map((desc, idx) => (
                      <li key={idx} style={styles.descriptionItem}>
                        <span
                          style={{
                            ...styles.checkmark,
                            color: brandSettings.brand_color,
                          }}
                        >
                          ✓
                        </span>
                        <span>{desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            <button
                  style={{
                    ...styles.button,
                    background: `${brandSettings.brand_color}CC`,
                    borderColor: `${brandSettings.brand_color}40`,
                    marginTop: "auto",
                  }}
                  onClick={() => {
                  // Priority: Use plan-specific checkout URL, fallback to environment variables
                  let url: string | undefined = isYearly
                    ? plan.yearly_checkout_url
                    : plan.monthly_checkout_url;
                  
                  // If no plan-specific URL, try to determine plan type and use env vars
                  if (!url && plan.title) {
                    // Try to match plan title to Premium or Pro
                    const planTitle = plan.title.toLowerCase();
                    if (planTitle.includes("premium")) {
                      url = isYearly
                        ? PREMIUM_YEARLY_PURCHASE_URL
                        : PREMIUM_MONTHLY_PURCHASE_URL;
                    } else if (planTitle.includes("pro")) {
                      url = isYearly
                        ? PRO_YEARLY_PURCHASE_URL
                        : PRO_MONTHLY_PURCHASE_URL;
                    }
                  }
                  
                  if (url) {
                    window.location.href = url;
                  } else {
                    console.error("No checkout URL available for this plan");
                    alert("Checkout URL not configured. Please contact support.");
                  }
                }}
              >
                Subscribe
            </button>
              </div>
            </div>
            );
            })}
          </div>
          {plans.length > 3 && (
            <div style={styles.scrollButtons}>
              <button
                onClick={() => {
                  if (gridRef.current) {
                    gridRef.current.scrollBy({ left: -400, behavior: "smooth" });
                  }
                }}
                style={styles.scrollButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 122, 0, 0.2)";
                  e.currentTarget.style.borderColor = "#ff7a00";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                }}
              >
                ←
              </button>
              <button
                onClick={() => {
                  if (gridRef.current) {
                    gridRef.current.scrollBy({ left: 400, behavior: "smooth" });
                  }
                }}
                style={styles.scrollButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 122, 0, 0.2)";
                  e.currentTarget.style.borderColor = "#ff7a00";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                }}
              >
                →
              </button>
            </div>
          )}
        </div>

        <p style={styles.footer}>
          If you have any problems, contact us at{" "}
          <a href="mailto:info@workmedia.no" style={styles.footerLink}>info@workmedia.no</a>
        </p>

        {/* Watermark - Only shown for free plan users */}
        {permissions.showUpgradeBranding && (
          <a
            href="https://whop.com/upgradeplan/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: "fixed",
              bottom: 20,
              right: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              background: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(10px) saturate(180%)",
              WebkitBackdropFilter: "blur(10px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 12,
              textDecoration: "none",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.2s",
              zIndex: 1000,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.8)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.6)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span>Powered by</span>
            <span style={{
              color: brandSettings.brand_color,
              fontWeight: 600,
            }}>
              Upgrade
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                opacity: 0.7,
                transition: "opacity 0.2s",
              }}
            >
              <path
                d="M2 2L10 10M10 2V10H2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        )}
      </div>

      {/* Owner Configuration Modal - Only rendered if isOwner === true */}
      {/* Plan configuration is rendered inline on /upgrade to avoid routing issues caused by Whop iframe mounting */}
      {isOwner === true && (
        <OwnerConfigModal
          isOpen={showOwnerConfig}
          onClose={() => setShowOwnerConfig(false)}
          brandColor={brandSettings.brand_color}
        />
      )}
    </div>
  );
}

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const usePound = color[0] === "#";
  const col = usePound ? color.slice(1) : color;
  const num = parseInt(col, 16);
  let r = (num >> 16) + amount;
  let g = (num >> 8 & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;
  return (usePound ? "#" : "") + (r << 16 | g << 8 | b).toString(16).padStart(6, "0");
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    color: "#fff",
    padding: "30px 20px 20px",
    textAlign: "center",
    position: "relative",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    position: "relative",
  },
  logo: {
    maxWidth: 50,
    maxHeight: 50,
    objectFit: "contain",
    display: "block",
    margin: "0 auto",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 6,
    fontWeight: 400,
  },
  title: {
    fontSize: 36,
    fontWeight: 300,
    marginBottom: 24,
    fontFamily: "serif",
    letterSpacing: "-0.5px",
  },
  toggleContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  toggleSwitch: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer",
  },
  toggleSlider: {
    position: "relative",
    width: 200,
    height: 48,
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    borderRadius: 12,
    border: "1px solid rgba(255, 255, 255, 0.18)",
    transition: "all 0.3s",
    display: "flex",
    cursor: "pointer",
    boxSizing: "border-box",
    padding: 0,
    overflow: "hidden",
  },
  toggleText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: 600,
    minWidth: 60,
    textAlign: "center",
  },
  gridContainer: {
    position: "relative",
    marginBottom: 20,
    display: "flex",
    justifyContent: "center",
  },
  grid: {
    display: "flex",
    gap: 20,
    maxWidth: 1200,
    margin: "0 auto",
    alignItems: "stretch",
    overflowX: "auto",
    scrollBehavior: "smooth",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    paddingBottom: 10,
    WebkitOverflowScrolling: "touch",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  scrollButtons: {
    display: "flex",
    justifyContent: "center",
    gap: 16,
    marginTop: 24,
  },
  scrollButton: {
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: "50%",
    width: 48,
    height: 48,
    color: "#fff",
    fontSize: 20,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  card: {
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    borderRadius: 16,
    padding: "20px 18px",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    width: 260,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    position: "relative",
    transition: "transform 0.3s",
    overflow: "hidden",
    height: "100%", // Make all cards same height
  },
  featuredCard: {
    transform: "translateY(-8px) scale(1.02)",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    zIndex: 1,
  },
  badge: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    padding: "6px 16px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    color: "#fff",
    whiteSpace: "nowrap",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 6,
    color: "#fff",
  },
  planDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 16,
    lineHeight: 1.5,
  },
  priceContainer: {
    marginBottom: 18,
  },
  price: {
    fontSize: 36,
    fontWeight: 700,
    lineHeight: 1,
  },
  priceUnit: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    marginLeft: 4,
    fontWeight: 400,
  },
  featuresSection: {
    marginBottom: 18,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    marginBottom: 12,
  },
  descriptionList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    textAlign: "left",
  },
  descriptionItem: {
    padding: "6px 0",
    color: "#fff",
    fontSize: 12,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    lineHeight: 1.4,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
    marginTop: 2,
  },
  button: {
    width: "100%",
    padding: "12px 20px",
    borderRadius: 10,
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 122, 0, 0.8)",
    backdropFilter: "blur(10px) saturate(180%)",
    WebkitBackdropFilter: "blur(10px) saturate(180%)",
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.2s",
    position: "relative",
    overflow: "hidden",
  },
  footer: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 20,
    textAlign: "center",
  },
  footerLink: {
    textDecoration: "underline",
    cursor: "pointer",
    color: "rgba(255, 255, 255, 0.9)",
    textDecorationColor: "rgba(255, 255, 255, 0.5)",
  },
};

