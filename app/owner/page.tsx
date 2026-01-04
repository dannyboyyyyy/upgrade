"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { PlanPermissions } from "../lib/getPlanPermissions";

export const dynamic = "force-dynamic";

const OWNER_ID = "whop-app"; // fast owner, ingen auth

type UpgradeOption = {
  title: string;
  plan_description: string;
  monthly_price: number;
  yearly_price: number;
  monthly_checkout_url: string;
  yearly_checkout_url: string;
  description: string[];
  is_featured: boolean;
};

type BrandSettings = {
  logo_url: string;
  brand_color: string;
};

export default function OwnerPage() {
  const [count, setCount] = useState(1);
  const [options, setOptions] = useState<UpgradeOption[]>([
    {
      title: "",
      plan_description: "",
      monthly_price: 0,
      yearly_price: 0,
      monthly_checkout_url: "",
      yearly_checkout_url: "",
      description: [],
      is_featured: false,
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [activeTab, setActiveTab] = useState<"plans" | "preview" | "designing">("plans");
  const [plan, setPlan] = useState<"free" | "premium" | "pro">("free");
  const [permissions, setPermissions] = useState<PlanPermissions>({
    plan: "free",
    maxPlans: 1,
    canUseMonthly: true,
    canUseYearly: false,
    showUpgradeBranding: true,
    canCustomizeColor: false,
    canCustomizeLogo: false,
    hasPrioritySupport: false,
  });
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    logo_url: "",
    brand_color: "#ff7a00",
  });
  const [whopPlanData, setWhopPlanData] = useState<{
    PRO_MONTHLY_PLAN_ID?: string;
    PRO_YEARLY_PLAN_ID?: string;
    PREMIUM_MONTHLY_PLAN_ID?: string;
    PREMIUM_YEARLY_PLAN_ID?: string;
    PRO_MONTHLY_PURCHASE_URL?: string;
    PRO_YEARLY_PURCHASE_URL?: string;
    PREMIUM_MONTHLY_PURCHASE_URL?: string;
    PREMIUM_YEARLY_PURCHASE_URL?: string;
  }>({});

  // Fetch Whop product data (plan IDs and checkout URLs)
  useEffect(() => {
    const fetchWhopProducts = async () => {
      try {
        const response = await fetch("/api/whop/products");
        if (response.ok) {
          const data = await response.json();
          setWhopPlanData(data);
        }
      } catch (err) {
        console.error("Error fetching Whop products:", err);
      }
    };
    
    fetchWhopProducts();
  }, []);

  // Verify Whop user and get plan permissions (MUST RUN FIRST - CRITICAL)
  useEffect(() => {
    const verifyWhopUser = async () => {
      try {
        // Get Whop token from URL params or localStorage (Whop provides this)
        const urlParams = new URLSearchParams(window.location.search);
        const whopToken = urlParams.get("token") || localStorage.getItem("whop_token");
        
        // Store token for future use
        if (whopToken && !localStorage.getItem("whop_token")) {
          localStorage.setItem("whop_token", whopToken);
        }
        
        const response = await fetch("/api/whop/verify", {
          headers: {
            "x-whop-token": whopToken || "",
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setPlan(data.plan);
          setPermissions(data.permissions);
          
          // Apply permissions immediately
          if (data.permissions.maxPlans !== Infinity && options.length > data.permissions.maxPlans) {
            setOptions(options.slice(0, data.permissions.maxPlans));
          }
          setIsYearly(data.permissions.canUseYearly);
        } else {
          // Default to free on error
          setPlan("free");
          const freePermissions = {
            plan: "free" as const,
            maxPlans: 1,
            canUseMonthly: true,
            canUseYearly: false,
            showUpgradeBranding: true,
            canCustomizeColor: false,
            canCustomizeLogo: false,
            hasPrioritySupport: false,
          };
          setPermissions(freePermissions);
        }
      } catch (err) {
        console.error("Error verifying Whop user:", err);
        // Default to free on error
        setPlan("free");
        const freePermissions = {
          plan: "free" as const,
          maxPlans: 1,
          canUseMonthly: true,
          canUseYearly: false,
          showUpgradeBranding: true,
          canCustomizeColor: false,
          canCustomizeLogo: false,
          hasPrioritySupport: false,
        };
        setPermissions(freePermissions);
      }
    };
    
    verifyWhopUser();
  }, []);

  // Hent eksisterende data fra Supabase (after permissions are loaded)
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error: fetchError } = await supabase
        .from("upgrade_sections")
          .select("*")
        .eq("owner_id", OWNER_ID)
        .single();

        if (fetchError) {
          console.error("Supabase error:", fetchError);
          // If no data exists, set default plan
          if (fetchError.code === "PGRST116") {
            setOptions([{
              title: "Plan 1",
              plan_description: "",
              monthly_price: 15,
              yearly_price: 150,
              monthly_checkout_url: "",
              yearly_checkout_url: "",
              description: [],
              is_featured: false,
            }]);
            setCount(1);
          } else {
            setError(fetchError.message);
          }
        } else if (data) {
          // Load upgrades
          if (data.upgrades && Array.isArray(data.upgrades) && data.upgrades.length > 0) {
            const transformedOptions = data.upgrades.map((opt: any) => ({
              title: opt.title || "",
              plan_description: opt.plan_description || "",
              monthly_price: opt.monthly_price || opt.price || 0,
              yearly_price: opt.yearly_price || 0,
              monthly_checkout_url: opt.monthly_checkout_url || opt.checkout_url || "",
              yearly_checkout_url: opt.yearly_checkout_url || "",
              description: opt.description || [],
              is_featured: opt.is_featured || false,
            }));
            // Apply permissions restrictions after loading
            if (permissions.maxPlans !== Infinity && transformedOptions.length > permissions.maxPlans) {
              setOptions(transformedOptions.slice(0, permissions.maxPlans));
              setCount(permissions.maxPlans);
            } else {
              setOptions(transformedOptions);
              setCount(transformedOptions.length);
            }
          } else {
            // No plans exist, set default plan
            setOptions([{
              title: "Plan 1",
              plan_description: "",
              monthly_price: 15,
              yearly_price: 150,
              monthly_checkout_url: "",
              yearly_checkout_url: "",
              description: [],
              is_featured: false,
            }]);
            setCount(1);
          }
          // Load brand settings
          if (data.brand_settings) {
            setBrandSettings({
              logo_url: data.brand_settings.logo_url || "",
              brand_color: data.brand_settings.brand_color || data.brand_settings.primary_color || "#ff7a00",
            });
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      }
    };
    load();
  }, [permissions.maxPlans]);

  // Add a new plan (with strict permission restrictions)
  const handleAddPlan = () => {
    if (options.length >= permissions.maxPlans) {
      const planName = plan === "free" ? "Free" : plan === "premium" ? "Premium" : "Pro";
      alert(`You've reached the maximum number of plans for your ${planName} plan (${permissions.maxPlans === Infinity ? "unlimited" : permissions.maxPlans}). Please upgrade to add more plans.`);
      return;
    }
    setOptions([
      ...options,
      {
          title: "",
        plan_description: "",
          monthly_price: 0,
          yearly_price: 0,
        monthly_checkout_url: "",
        yearly_checkout_url: "",
        description: [],
        is_featured: false,
      },
    ]);
    setCount(count + 1);
  };

  // Remove a plan
  const handleRemovePlan = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    setCount(newOptions.length);
  };

  // Lagre (DELETE + INSERT = alltid én rad)
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Filter out empty plans and validate only plans with titles
      const validOptions = options.filter((opt) => opt.title && opt.title.trim() !== "");
      
      if (validOptions.length === 0) {
        throw new Error("Please add at least one plan with a title");
      }

      // Validate that each valid plan has at least one checkout URL
      const hasInvalidData = validOptions.some(
        (opt) =>
          !opt.monthly_checkout_url && !opt.yearly_checkout_url
      );
      if (hasInvalidData) {
        throw new Error(
          "Please fill in at least one checkout URL (monthly or yearly) for each plan with a title"
        );
      }

      // Transform options to include all pricing and checkout information (only save valid plans)
      const upgradesWithPrice = validOptions.map((opt) => ({
        title: opt.title || "",
        plan_description: opt.plan_description || "",
        monthly_price: opt.monthly_price || 0,
        yearly_price: opt.yearly_price || 0,
        monthly_checkout_url: opt.monthly_checkout_url || "",
        yearly_checkout_url: opt.yearly_checkout_url || "",
        description: opt.description.filter((d) => d.trim() !== ""), // Only save non-empty features
        is_featured: opt.is_featured || false,
        // Keep backward compatibility with old format
        price: opt.monthly_price || 0,
        checkout_url: opt.monthly_checkout_url || opt.yearly_checkout_url || "",
      }));

      console.log("Saving plans:", upgradesWithPrice);

      // First, try to update/insert the main data (without brand_settings)
      const { error: upsertError } = await supabase
      .from("upgrade_sections")
        .upsert(
          {
      owner_id: OWNER_ID,
            upgrades: upgradesWithPrice,
          },
          {
            onConflict: "owner_id",
          }
        );

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        console.error("Attempted to save:", { owner_id: OWNER_ID, upgrades: upgradesWithPrice });
        const errorMsg = upsertError.message || upsertError.details || JSON.stringify(upsertError);
        throw new Error(`Save failed: ${errorMsg}`);
      }
      
      console.log("Plans saved successfully:", upgradesWithPrice);

      // Try to update brand_settings separately (if column exists)
      // Don't let brand_settings errors prevent the save from succeeding
      let brandSettingsSaved = false;
      try {
        const { error: brandError } = await supabase
          .from("upgrade_sections")
          .update({ brand_settings: brandSettings })
      .eq("owner_id", OWNER_ID);

        if (brandError) {
          console.warn("Brand settings update failed (column may not exist):", brandError);
          // Don't show alert - plans are saved successfully
    } else {
          brandSettingsSaved = true;
        }
      } catch (err) {
        console.warn("Brand settings update exception:", err);
        // Don't show alert - plans are saved successfully
      }

      // Always show success message since plans are saved
      if (brandSettingsSaved) {
        alert("Upgrades and brand settings saved successfully!");
      } else {
        alert("Upgrades saved successfully! Note: Brand settings could not be saved. Please add a 'brand_settings' column (type: jsonb) to your 'upgrade_sections' table in Supabase.");
      }
    } catch (err: any) {
      let errorMessage = "Failed to save upgrades";
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error?.message) {
        errorMessage = err.error.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else if (err) {
        errorMessage = JSON.stringify(err);
      }
      
      console.error("Save error:", err);
      setError(errorMessage);
      alert(`Error saving upgrades: ${errorMessage}`);
    } finally {
    setSaving(false);
    }
  };

  // Preview component - matches upgrade page exactly
  const PreviewComponent = () => {
    const gradientBackground = `linear-gradient(135deg, #0b0b0b 0%, #1a1a1a 50%, #0b0b0b 100%)`;

  return (
      <div style={{ minHeight: "100vh", color: "#fff", padding: "60px 24px 40px", textAlign: "center", position: "relative", background: gradientBackground }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            {brandSettings.logo_url && (
              <img
                src={brandSettings.logo_url}
                alt="Logo"
                style={{ maxWidth: 60, maxHeight: 60, objectFit: "contain", display: "block", margin: "0 auto", filter: `drop-shadow(0 4px 12px ${brandSettings.brand_color}66)` }}
              />
            )}
          </div>
          <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginBottom: 8, fontWeight: 400, textAlign: "center" }}>
            {permissions.showUpgradeBranding ? "Upgrade Your Account" : "Current Plan"}
          </p>
          <h1 style={{ fontSize: 42, fontWeight: 300, marginBottom: 40, fontFamily: "serif", letterSpacing: "-0.5px" }}>
            Choose a right plan for you
          </h1>
          
          <div style={{ position: "relative", marginBottom: 60, display: "flex", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: 24, maxWidth: 1200, margin: "0 auto", alignItems: "stretch", overflowX: "visible", justifyContent: "center", flexWrap: "wrap" }}>
              {(() => {
                // Sort plans: if exactly 3 plans and one is featured, put featured in middle
                let sortedOptions = options.filter((opt) => opt.title);
                if (sortedOptions.length === 3) {
                  const featuredIndex = sortedOptions.findIndex(p => p.is_featured);
                  if (featuredIndex !== -1) {
                    const featured = sortedOptions[featuredIndex];
                    const others = sortedOptions.filter((_, i) => i !== featuredIndex);
                    sortedOptions = [others[0], featured, others[1]];
                  }
                }
                return sortedOptions.map((plan, i) => {
                  // Always lift featured plan slightly, regardless of count
                  const isFeatured = plan.is_featured;
                  return (
        <div
          key={i}
          style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        backdropFilter: "blur(20px) saturate(180%)",
                        WebkitBackdropFilter: "blur(20px) saturate(180%)",
                        borderRadius: 16,
                        padding: "24px 20px",
                        border: isFeatured ? "1px solid rgba(255, 255, 255, 0.25)" : "1px solid rgba(255, 255, 255, 0.18)",
                        width: 280,
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        textAlign: "left",
                        position: "relative",
                        transition: "transform 0.3s",
                        transform: isFeatured ? "translateY(-12px) scale(1.02)" : "none",
                        overflow: "hidden",
                        zIndex: isFeatured ? 1 : 0,
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
                        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "rgba(0, 0, 0, 0.6)", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500, color: "#fff", whiteSpace: "nowrap", zIndex: 2 }}>
                          Featured
                        </div>
                      </>
                    )}
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: "#fff" }}>{plan.title}</h2>
                      {plan.plan_description && (
                        <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.7)", marginBottom: 20, lineHeight: 1.5 }}>
                          {plan.plan_description}
                        </p>
                      )}
                      <div style={{ marginBottom: 24 }}>
                        <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: brandSettings.brand_color }}>
                          ${plan.monthly_price}
                        </span>
                        <span style={{ fontSize: 16, color: "rgba(255, 255, 255, 0.7)", marginLeft: 4, fontWeight: 400 }}>
                          /Month
                        </span>
                      </div>
                      {plan.description.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 12 }}>What You Get</h3>
                          <ul style={{ listStyle: "none", padding: 0, margin: 0, textAlign: "left" }}>
                            {plan.description.map((desc, idx) => (
                              <li key={idx} style={{ padding: "8px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "flex-start", gap: 10, lineHeight: 1.5 }}>
                                <span style={{ fontSize: 16, fontWeight: 600, flexShrink: 0, marginTop: 2, color: brandSettings.brand_color }}>✓</span>
                                <span>{desc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <button
                        style={{
                          width: "100%",
                          padding: "14px 24px",
                          borderRadius: 10,
                          border: "none",
                          background: brandSettings.brand_color,
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: 16,
                          cursor: "pointer",
                          transition: "background 0.2s, transform 0.2s",
                          marginTop: "auto",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = brandSettings.brand_color;
                          e.currentTarget.style.opacity = "0.9";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = brandSettings.brand_color;
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        Subscribe
                      </button>
                    </div>
                  </div>
                  );
                });
              })()}
            </div>
          </div>
          
          <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginTop: 60, textAlign: "center" }}>
            If you have any problems, contact us at{" "}
            <a href="mailto:info@workmedia.no" style={{ textDecoration: "underline", cursor: "pointer", color: "rgba(255, 255, 255, 0.9)" }}>info@workmedia.no</a>
          </p>
        </div>
      </div>
    );
  };

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

  // Menu/Tab Navigation Component
  const MenuTabs = () => (
    <div style={styles.menuContainer}>
      <button
        onClick={() => setActiveTab("plans")}
        style={{
          ...styles.menuTab,
          background: activeTab === "plans" ? brandSettings.brand_color : "transparent",
          color: activeTab === "plans" ? "#fff" : brandSettings.brand_color,
          borderColor: brandSettings.brand_color,
        }}
      >
        Plans
      </button>
      <button
        onClick={() => setActiveTab("preview")}
        style={{
          ...styles.menuTab,
          background: activeTab === "preview" ? brandSettings.brand_color : "transparent",
          color: activeTab === "preview" ? "#fff" : brandSettings.brand_color,
          borderColor: brandSettings.brand_color,
        }}
      >
        Preview
      </button>
      <button
        onClick={() => setActiveTab("designing")}
        style={{
          ...styles.menuTab,
          background: activeTab === "designing" ? brandSettings.brand_color : "transparent",
          color: activeTab === "designing" ? "#fff" : brandSettings.brand_color,
          borderColor: brandSettings.brand_color,
        }}
      >
        Designing
      </button>
    </div>
  );

    if (error) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Owner Dashboard</h1>
        <div style={styles.errorContainer}>
          <p style={{ ...styles.errorText, color: brandSettings.brand_color }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  const gradientBackground = `linear-gradient(135deg, #0b0b0b 0%, #1a1a1a 50%, #0b0b0b 100%)`;

  return (
    <div style={{ ...styles.page, background: gradientBackground }}>
      <div style={styles.container}>
        <h1 style={styles.title}>Owner Dashboard</h1>
        
        <MenuTabs />

        {/* Plans Tab - Purchase page for Whop owners */}
        {activeTab === "plans" && (
          <div style={{ padding: "20px 20px", textAlign: "center" }}>
            <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8, color: "#fff" }}>
              Choose Your Plan
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginBottom: 20 }}>
              Select a plan to get access to this platform
            </p>
            
            {/* Billing Period Toggle for Plans Tab */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              marginBottom: 24,
            }}>
              <span style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 14 }}>Monthly</span>
              <label style={{
                position: "relative",
                display: "inline-block",
                width: 60,
                height: 32,
                cursor: "pointer",
              }}>
                <input
                  type="checkbox"
                  checked={isYearly}
                  onChange={(e) => setIsYearly(e.target.checked)}
                  style={{ display: "none" }}
                />
                <span style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: isYearly ? brandSettings.brand_color : "#222",
                  borderRadius: 16,
                  transition: "background 0.3s",
                }}>
                  <span style={{
                    position: "absolute",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#fff",
                    top: 4,
                    left: isYearly ? 32 : 4,
                    transition: "left 0.3s",
                  }} />
                </span>
      </label>
              <span style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 14 }}>Yearly</span>
            </div>
            
            <div style={{
              display: "flex",
              gap: 20,
              maxWidth: 1000,
              margin: "0 auto",
              justifyContent: "center",
              flexWrap: "wrap",
            }}>
              {/* Tier 1: Free */}
              <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                borderRadius: 16,
                padding: "24px 20px",
                border: plan === "free" ? `2px solid ${brandSettings.brand_color}` : "1px solid rgba(255, 255, 255, 0.18)",
                width: 280,
                display: "flex",
                flexDirection: "column",
                opacity: 1,
                order: 0,
              }}>
                {plan === "free" && (
                  <div style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: brandSettings.brand_color,
                    padding: "6px 16px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#fff",
                  }}>
                    Current Plan
                  </div>
                )}
                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#fff" }}>Free</h3>
                <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.7)", marginBottom: 20 }}>
                  Perfect for getting started
                </p>
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 42, fontWeight: 700, color: brandSettings.brand_color }}>$0</span>
                  <span style={{ fontSize: 15, color: "rgba(255, 255, 255, 0.7)", marginLeft: 4 }}>/month</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0", textAlign: "left" }}>
                  <li style={{ padding: "6px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: brandSettings.brand_color }}>✓</span>
                    <span>1 plan</span>
                  </li>
                  <li style={{ padding: "6px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: brandSettings.brand_color }}>✓</span>
                    <span>Monthly plan only</span>
                  </li>
                  <li style={{ padding: "6px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: brandSettings.brand_color }}>✓</span>
                    <span>"Upgrade" branding</span>
                  </li>
                  <li style={{ padding: "6px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#666" }}>✗</span>
                    <span style={{ color: "#666" }}>No customization</span>
                  </li>
                </ul>
                <button
                  onClick={() => {
                    // Free plan is automatic - no action needed
                    alert("You are already on the Free plan. Upgrade to Premium or Pro for more features.");
                  }}
          style={{
                    width: "100%",
                    padding: "12px 20px",
                    borderRadius: 10,
                    border: plan === "free" ? "none" : `1px solid ${brandSettings.brand_color}`,
                    background: plan === "free" ? brandSettings.brand_color : "transparent",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: "pointer",
                    marginTop: "auto",
                  }}
                  onMouseEnter={(e) => {
                    if (plan !== "free") {
                      e.currentTarget.style.background = brandSettings.brand_color;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan !== "free") {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {plan === "free" ? "Current Plan" : "Select Plan"}
                </button>
                
                {/* Pricing featured by */}
                <div style={{
            marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <p style={{
                    fontSize: 11,
                    color: "rgba(255, 255, 255, 0.5)",
                    margin: 0,
                  }}>
                    Pricing featured by
                  </p>
                  {brandSettings.logo_url ? (
                    <div style={{
                      width: 50,
                      height: 50,
                      borderRadius: 10,
                      overflow: "hidden",
                      background: "rgba(255, 255, 255, 0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <img
                        src={brandSettings.logo_url}
                        alt="Logo"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      width: 50,
                      height: 50,
                      borderRadius: 10,
                      background: "rgba(255, 255, 255, 0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <span style={{
                        fontSize: 20,
                        color: "rgba(255, 255, 255, 0.3)",
                      }}>N</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tier 3: Pro - Always in middle and featured */}
              <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                borderRadius: 16,
                padding: "24px 20px",
                border: plan === "pro" ? `2px solid ${brandSettings.brand_color}` : "1px solid rgba(255, 255, 255, 0.25)",
                width: 280,
                display: "flex",
                flexDirection: "column",
                transform: "translateY(-8px) scale(1.02)",
                position: "relative",
                opacity: 1,
                order: 1,
              }}>
                {plan === "pro" && (
                  <div style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: brandSettings.brand_color,
                    padding: "6px 16px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#fff",
                  }}>
                    Current Plan
                  </div>
                )}
                {plan !== "pro" && (
                  <div style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(0, 0, 0, 0.6)",
                    padding: "6px 16px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#fff",
                  }}>
                    Featured
                  </div>
                )}
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "66%",
                  background: `linear-gradient(to top, ${brandSettings.brand_color}40, ${brandSettings.brand_color}00)`,
                  pointerEvents: "none",
                  zIndex: 0,
                  borderRadius: "0 0 16px 16px",
                }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: "#fff" }}>Pro</h3>
                  <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginBottom: 20 }}>
                    For large organizations
                  </p>
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ fontSize: 48, fontWeight: 700, color: brandSettings.brand_color }}>
                      {isYearly ? "$139.99" : "$14.99"}
                    </span>
                    <span style={{ fontSize: 16, color: "rgba(255, 255, 255, 0.7)", marginLeft: 4 }}>
                      {isYearly ? "/year" : "/month"}
                    </span>
                    {isYearly && (
                      <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", marginTop: 4 }}>
                        Save 22% vs monthly
                      </div>
                    )}
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0", textAlign: "left" }}>
                    <li style={{ padding: "6px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: brandSettings.brand_color }}>✓</span>
                      <span>Unlimited plans</span>
                    </li>
                    <li style={{ padding: "6px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: brandSettings.brand_color }}>✓</span>
                      <span>Custom branding (color + logo)</span>
                    </li>
                    <li style={{ padding: "6px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: brandSettings.brand_color }}>✓</span>
                      <span>Monthly & yearly plans</span>
                    </li>
                    <li style={{ padding: "6px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: brandSettings.brand_color }}>✓</span>
                      <span>No "Upgrade" branding</span>
                    </li>
                    <li style={{ padding: "6px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: brandSettings.brand_color }}>✓</span>
                      <span>Priority support</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => {
                      // Redirect to Whop checkout for Pro
                      const proUrl = isYearly
                        ? (whopPlanData.PRO_YEARLY_PURCHASE_URL || process.env.NEXT_PUBLIC_PRO_YEARLY_PURCHASE_URL || process.env.NEXT_PUBLIC_PRO_PURCHASE_URL)
                        : (whopPlanData.PRO_MONTHLY_PURCHASE_URL || process.env.NEXT_PUBLIC_PRO_MONTHLY_PURCHASE_URL || process.env.NEXT_PUBLIC_PRO_PURCHASE_URL);
                      if (proUrl) {
                        window.location.href = proUrl;
                      } else {
                        alert("Pro checkout URL not configured. Please contact support.");
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 20px",
                      borderRadius: 10,
                      border: plan === "pro" ? "none" : `1px solid ${brandSettings.brand_color}`,
                      background: plan === "pro" ? brandSettings.brand_color : "transparent",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: "pointer",
                      marginTop: "auto",
                    }}
                    onMouseEnter={(e) => {
                      if (plan !== "pro") {
                        e.currentTarget.style.background = brandSettings.brand_color;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (plan !== "pro") {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {plan === "pro" ? "Current Plan" : "Get Started"}
                  </button>
                </div>
              </div>

              {/* Tier 2: Premium */}
              <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                borderRadius: 16,
                padding: "24px 20px",
                border: plan === "premium" ? `2px solid ${brandSettings.brand_color}` : "1px solid rgba(255, 255, 255, 0.18)",
                width: 280,
                display: "flex",
                flexDirection: "column",
                opacity: 1,
                order: 2,
              }}>
                {plan === "premium" && (
                  <div style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: brandSettings.brand_color,
                    padding: "6px 16px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#fff",
                  }}>
                    Current Plan
                  </div>
                )}
                <div style={{ position: "relative", zIndex: 1 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#fff" }}>Premium</h3>
                  <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.7)", marginBottom: 20 }}>
                    For growing businesses
                  </p>
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ fontSize: 42, fontWeight: 700, color: brandSettings.brand_color }}>
                      {isYearly ? "$89.99" : "$9.99"}
                    </span>
                    <span style={{ fontSize: 15, color: "rgba(255, 255, 255, 0.7)", marginLeft: 4 }}>
                      {isYearly ? "/year" : "/month"}
                    </span>
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0", textAlign: "left" }}>
                    <li style={{ padding: "6px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: brandSettings.brand_color }}>✓</span>
                      <span>2 plans</span>
                    </li>
                    <li style={{ padding: "6px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: brandSettings.brand_color }}>✓</span>
                      <span>Monthly & yearly plans</span>
                    </li>
                    <li style={{ padding: "6px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: brandSettings.brand_color }}>✓</span>
                      <span>Custom brand color</span>
                    </li>
                    <li style={{ padding: "6px 0", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: brandSettings.brand_color }}>✓</span>
                      <span>No "Upgrade" branding</span>
                    </li>
                  </ul>
                <button
                  onClick={() => {
                    // Redirect to Whop checkout for Premium
                    const premiumUrl = isYearly 
                      ? (whopPlanData.PREMIUM_YEARLY_PURCHASE_URL || process.env.NEXT_PUBLIC_PREMIUM_YEARLY_PURCHASE_URL || process.env.NEXT_PUBLIC_PREMIUM_PURCHASE_URL)
                      : (whopPlanData.PREMIUM_MONTHLY_PURCHASE_URL || process.env.NEXT_PUBLIC_PREMIUM_MONTHLY_PURCHASE_URL || process.env.NEXT_PUBLIC_PREMIUM_PURCHASE_URL);
                    if (premiumUrl) {
                      window.location.href = premiumUrl;
                    } else {
                      alert("Premium checkout URL not configured. Please contact support.");
                    }
                  }}
                    style={{
                      width: "100%",
                      padding: "12px 20px",
                      borderRadius: 10,
                      border: plan === "premium" ? "none" : `1px solid ${brandSettings.brand_color}`,
                      background: plan === "premium" ? brandSettings.brand_color : "transparent",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: "pointer",
                      marginTop: "auto",
                    }}
                    onMouseEnter={(e) => {
                      if (plan !== "premium") {
                        e.currentTarget.style.background = brandSettings.brand_color;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (plan !== "premium") {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {plan === "premium" ? "Current Plan" : "Get Started"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}


        {/* Preview Tab */}
        {activeTab === "preview" && (
          <div>
            <PreviewComponent />
          </div>
        )}

        {/* Designing Tab */}
        {activeTab === "designing" && (
          <div>
            {/* Brand Settings Section - Based on permissions */}
            {(permissions.canCustomizeColor || permissions.canCustomizeLogo) && (
              <div style={styles.brandSection}>
                <h2 style={styles.sectionTitle}>Brand Settings</h2>
                
                <div style={styles.brandSettingsGrid}>
                  {/* Logo Upload Box - Only for Pro */}
                  {permissions.canCustomizeLogo && (
                    <div
                      style={styles.uploadBox}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.borderColor = brandSettings.brand_color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  }}
                >
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setBrandSettings({
                            ...brandSettings,
                            logo_url: reader.result as string,
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ display: "none" }}
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload" style={styles.uploadLabel}>
                    {brandSettings.logo_url ? (
                      <div style={styles.logoPreviewContainer}>
                        <img
                          src={brandSettings.logo_url}
                          alt="Logo preview"
                          style={styles.logoPreviewInBox}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <span style={styles.uploadText}>Change Logo</span>
                      </div>
                    ) : (
                      <span style={styles.uploadText}>Upload Logo</span>
                    )}
                  </label>
                    </div>
                  )}

                  {/* Color Branding Box - For tier2 and tier3 */}
                  <div style={styles.colorBox}>
                  <label style={styles.label}>Brand Color (for buttons & accents)</label>
                  <div style={styles.colorInputContainer}>
                    <input
                      type="color"
                      value={brandSettings.brand_color}
                      onChange={async (e) => {
                        const newColor = e.target.value;
                        setBrandSettings({
                          ...brandSettings,
                          brand_color: newColor,
                        });
                        // Auto-save brand color changes
                        try {
                          const { error } = await supabase
                            .from("upgrade_sections")
                            .update({ brand_settings: { ...brandSettings, brand_color: newColor } })
                            .eq("owner_id", OWNER_ID);
                          
                          if (error) {
                            console.error("Auto-save brand color error:", error);
                            const { error: upsertError } = await supabase
                              .from("upgrade_sections")
                              .upsert(
                                {
                                  owner_id: OWNER_ID,
                                  brand_settings: { ...brandSettings, brand_color: newColor },
                                },
                                { onConflict: "owner_id" }
                              );
                            if (upsertError) {
                              console.error("Auto-save brand color upsert also failed:", upsertError);
                            }
                          }
                        } catch (err) {
                          console.error("Auto-save brand color exception:", err);
                        }
                      }}
                      style={styles.colorInput}
                    />
                    <input
                      placeholder="#ff7a00"
                      value={brandSettings.brand_color}
                      onChange={async (e) => {
                        const newColor = e.target.value;
                        setBrandSettings({
                          ...brandSettings,
                          brand_color: newColor,
                        });
                        // Auto-save brand color changes
                        try {
                          const { error } = await supabase
                            .from("upgrade_sections")
                            .update({ brand_settings: { ...brandSettings, brand_color: newColor } })
                            .eq("owner_id", OWNER_ID);
                          
                          if (error) {
                            console.error("Auto-save brand color error:", error);
                            const { error: upsertError } = await supabase
                              .from("upgrade_sections")
                              .upsert(
                                {
                                  owner_id: OWNER_ID,
                                  brand_settings: { ...brandSettings, brand_color: newColor },
                                },
                                { onConflict: "owner_id" }
                              );
                            if (upsertError) {
                              console.error("Auto-save brand color upsert also failed:", upsertError);
                            }
                          }
                        } catch (err) {
                          console.error("Auto-save brand color exception:", err);
                        }
                      }}
                      onFocus={(e) => (e.target.style.borderColor = brandSettings.brand_color)}
                      onBlur={(e) => (e.target.style.borderColor = "#222")}
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>
              </div>
            )}
            {!permissions.canCustomizeColor && !permissions.canCustomizeLogo && (
              <div style={{ ...styles.brandSection, opacity: 0.5, pointerEvents: "none" }}>
                <h2 style={styles.sectionTitle}>Brand Settings</h2>
                <p style={{ color: "#666", fontSize: 14, marginTop: 12 }}>
                  Upgrade to Premium ($9.99) or Pro ($14.99) to customize your branding
                </p>
              </div>
            )}

            {/* Plan Management Section */}
            <div style={styles.controlSection}>
              <div style={styles.plansHeader}>
                <h2 style={styles.sectionTitle}>Plans ({options.length})</h2>
                <button
                  type="button"
                  onClick={handleAddPlan}
                  disabled={options.length >= permissions.maxPlans}
          style={{
                    ...styles.addPlanButton,
                    opacity: options.length >= permissions.maxPlans ? 0.5 : 1,
                    cursor: options.length >= permissions.maxPlans ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (options.length < permissions.maxPlans) {
                      e.currentTarget.style.background = brandSettings.brand_color;
                      e.currentTarget.style.color = "#fff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (options.length < permissions.maxPlans) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = brandSettings.brand_color;
                    }
                  }}
                >
                  + Add Plan
                </button>
              </div>

              {/* Billing Period Toggle - Based on permissions */}
              {permissions.canUseYearly && (
                <div style={styles.toggleContainer}>
                  <span style={styles.toggleLabel}>Billing Period:</span>
                  <label style={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={isYearly}
                      onChange={(e) => setIsYearly(e.target.checked)}
                      style={{ display: "none" }}
                    />
                    <span
          style={{
                        ...styles.toggleSlider,
                        background: isYearly ? brandSettings.brand_color : "#222",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "#fff",
                          top: 4,
                          left: isYearly ? 32 : 4,
                          transition: "left 0.3s",
                        }}
                      />
                    </span>
                    <span style={styles.toggleText}>
                      {isYearly ? "Monthly + Yearly" : "Monthly Only"}
                    </span>
      </label>
                </div>
              )}
              {!permissions.canUseYearly && (
                <div style={{ ...styles.toggleContainer, opacity: 0.5 }}>
                  <span style={styles.toggleLabel}>Billing Period:</span>
                  <span style={{ ...styles.toggleText, color: "#666" }}>Monthly Only (Upgrade to enable yearly)</span>
                </div>
              )}
            </div>

            <div style={styles.grid}>
      {options.map((opt, i) => (
                <div key={i} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>Plan {i + 1}</h3>
                    {options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePlan(i)}
                        style={{ ...styles.removePlanButton, borderColor: brandSettings.brand_color, color: brandSettings.brand_color }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = brandSettings.brand_color;
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = brandSettings.brand_color;
                        }}
                      >
                        × Remove
                      </button>
                    )}
                  </div>

          <input
            placeholder="Title"
            value={opt.title}
            onChange={(e) => {
              const copy = [...options];
              copy[i].title = e.target.value;
              setOptions(copy);
            }}
                    onFocus={(e) => (e.target.style.borderColor = brandSettings.brand_color)}
                    onBlur={(e) => (e.target.style.borderColor = "#222")}
                    style={styles.input}
                  />

                  <input
                    placeholder="Plan description (e.g., For personal or non commercial projects)"
                    value={opt.plan_description}
                    onChange={(e) => {
                      const copy = [...options];
                      copy[i].plan_description = e.target.value;
                      setOptions(copy);
                    }}
                    onFocus={(e) => (e.target.style.borderColor = brandSettings.brand_color)}
                    onBlur={(e) => (e.target.style.borderColor = "#222")}
                    style={styles.input}
                  />

                  <div style={{ ...styles.toggleContainer, justifyContent: "flex-start", marginTop: 0, marginBottom: 16 }}>
                    <span style={{ ...styles.toggleLabel, fontSize: 12 }}>Feature Plan:</span>
                    <label style={styles.toggleSwitch}>
                      <input
                        type="checkbox"
                        checked={opt.is_featured}
                        onChange={(e) => {
                          const copy = [...options];
                          const newFeaturedState = e.target.checked;
                          if (newFeaturedState) {
                            copy.forEach((opt, idx) => {
                              copy[idx].is_featured = idx === i;
                            });
                          } else {
                            copy[i].is_featured = false;
                          }
                          setOptions(copy);
                        }}
                        style={{ display: "none" }}
                      />
                      <span
                        style={{
                          ...styles.toggleSlider,
                          width: 50,
                          height: 26,
                          background: opt.is_featured ? brandSettings.brand_color : "#222",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: "#fff",
                            top: 3,
                            left: opt.is_featured ? 27 : 3,
                            transition: "left 0.3s",
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                          }}
                        />
                      </span>
                      <span style={{ ...styles.toggleText, fontSize: 12, minWidth: 70 }}>
                        {opt.is_featured ? "Featured" : "Not featured"}
                      </span>
                    </label>
                  </div>

                  <div style={styles.sectionDivider}></div>
                  <label style={{ ...styles.sectionLabel, color: brandSettings.brand_color }}>Features (up to 5)</label>
                  {opt.description.map((bullet, bulletIndex) => (
                    <div key={bulletIndex} style={styles.bulletContainer}>
                      <div style={styles.checkmarkIcon}>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                            fill={brandSettings.brand_color}
                          />
                        </svg>
                      </div>
                      <input
                        placeholder={`Feature ${bulletIndex + 1}`}
                        value={bullet}
                        onChange={(e) => {
                          const copy = [...options];
                          copy[i].description[bulletIndex] = e.target.value;
                          setOptions(copy);
                        }}
                        onFocus={(e) => (e.target.style.borderColor = brandSettings.brand_color)}
                        onBlur={(e) => (e.target.style.borderColor = "#222")}
                        style={{ ...styles.input, marginBottom: 8, flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...options];
                          copy[i].description = copy[i].description.filter(
                            (_, idx) => idx !== bulletIndex
                          );
                          setOptions(copy);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = brandSettings.brand_color;
                          e.currentTarget.style.color = brandSettings.brand_color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#222";
                          e.currentTarget.style.color = "#fff";
                        }}
                        style={styles.removeButton}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {opt.description.length < 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...options];
                        copy[i].description.push("");
                        setOptions(copy);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = brandSettings.brand_color;
                        e.currentTarget.style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = brandSettings.brand_color;
                      }}
                      style={{ ...styles.addButton, borderColor: brandSettings.brand_color, color: brandSettings.brand_color }}
                    >
                      + Add Feature
                    </button>
                  )}

                  <div style={styles.sectionDivider}></div>
                  <label style={{ ...styles.sectionLabel, color: brandSettings.brand_color }}>Monthly</label>
          <input
            placeholder="Monthly price"
            type="number"
            value={opt.monthly_price}
            onChange={(e) => {
              const copy = [...options];
              copy[i].monthly_price = Number(e.target.value);
              setOptions(copy);
            }}
                    onFocus={(e) => (e.target.style.borderColor = brandSettings.brand_color)}
                    onBlur={(e) => (e.target.style.borderColor = "#222")}
                    style={styles.input}
                  />
                  <input
                    placeholder="Monthly checkout URL"
                    value={opt.monthly_checkout_url}
                    onChange={(e) => {
                      const copy = [...options];
                      copy[i].monthly_checkout_url = e.target.value;
                      setOptions(copy);
                    }}
                    onFocus={(e) => (e.target.style.borderColor = brandSettings.brand_color)}
                    onBlur={(e) => (e.target.style.borderColor = "#222")}
                    style={styles.input}
                  />

                  {permissions.canUseYearly && (isYearly || plan !== "free") && (
                    <>
                      <div style={styles.sectionDivider}></div>
                      <label style={{ ...styles.sectionLabel, color: brandSettings.brand_color }}>Yearly</label>
          <input
            placeholder="Yearly price"
            type="number"
            value={opt.yearly_price}
            onChange={(e) => {
              const copy = [...options];
              copy[i].yearly_price = Number(e.target.value);
              setOptions(copy);
            }}
                        onFocus={(e) => (e.target.style.borderColor = brandSettings.brand_color)}
                        onBlur={(e) => (e.target.style.borderColor = "#222")}
                        style={styles.input}
          />
          <input
                        placeholder="Yearly checkout URL"
                        value={opt.yearly_checkout_url}
            onChange={(e) => {
              const copy = [...options];
                          copy[i].yearly_checkout_url = e.target.value;
              setOptions(copy);
            }}
                        onFocus={(e) => (e.target.style.borderColor = brandSettings.brand_color)}
                        onBlur={(e) => (e.target.style.borderColor = "#222")}
                        style={styles.input}
          />
                    </>
                  )}
        </div>
      ))}
            </div>

            <div style={styles.buttonContainer}>
              <button
                onClick={handleSave}
                disabled={saving}
                onMouseEnter={(e) => {
                  if (!saving) {
                    const r = parseInt(brandSettings.brand_color.slice(1, 3), 16);
                    const g = parseInt(brandSettings.brand_color.slice(3, 5), 16);
                    const b = parseInt(brandSettings.brand_color.slice(5, 7), 16);
                    const lighter = `rgb(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)})`;
                    e.currentTarget.style.background = lighter;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) e.currentTarget.style.background = brandSettings.brand_color;
                }}
                style={{
                  ...styles.button,
                  background: brandSettings.brand_color,
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
        {saving ? "Saving..." : "Save"}
      </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b0b0b",
    color: "#fff",
    padding: "20px 20px",
    textAlign: "center",
    position: "relative",
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 16,
  },
  controlSection: {
    marginBottom: 20,
    maxWidth: 1200,
    margin: "0 auto 20px",
  },
  label: {
    display: "block",
    fontSize: 13,
    marginBottom: 6,
    color: "#fff",
    fontWeight: 500,
  },
  select: {
    display: "block",
    width: "100%",
    maxWidth: 300,
    margin: "12px auto 0",
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid #222",
    background: "#111",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
  },
  grid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 24,
    maxWidth: 1200,
    margin: "0 auto 20px",
    alignItems: "start",
    justifyContent: "flex-start",
  },
  card: {
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: "24px 20px",
    width: 280,
    textAlign: "left",
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 12,
    color: "#fff",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    marginBottom: 10,
    borderRadius: 6,
    border: "1px solid #222",
    background: "#0b0b0b",
    color: "#fff",
    fontSize: 13,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s",
  },
  button: {
    width: "100%",
    maxWidth: 300,
    padding: 8,
    borderRadius: 6,
    border: "none",
    background: "#ff7a00",
    color: "#fff",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    margin: "0 auto",
    display: "block",
    transition: "background-color 0.2s",
  },
  errorContainer: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: 12,
    padding: 24,
    maxWidth: 600,
    margin: "0 auto",
  },
  errorText: {
    color: "#ff7a00",
    fontSize: 16,
    margin: 0,
  },
  sectionDivider: {
    height: 1,
    background: "#222",
    margin: "16px 0 10px",
  },
  sectionLabel: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#ff7a00",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  bulletContainer: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  checkmarkIcon: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    background: "transparent",
    border: "1px solid #222",
    color: "#fff",
    borderRadius: 4,
    width: 32,
    height: 32,
    cursor: "pointer",
    fontSize: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.2s",
  },
  addButton: {
    background: "transparent",
    border: "1px solid",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    marginTop: 6,
    transition: "all 0.2s",
  },
  toggleContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 14,
    color: "#fff",
    fontWeight: 500,
    marginRight: 8,
  },
  toggleSwitch: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer",
    gap: 12,
  },
  toggleSlider: {
    position: "relative",
    width: 60,
    height: 32,
    background: "#222",
    borderRadius: 16,
    transition: "background-color 0.3s",
    display: "block",
    cursor: "pointer",
  },
  toggleText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: 600,
    minWidth: 60,
    textAlign: "center",
  },
  brandSection: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    maxWidth: 1200,
    margin: "0 auto 20px",
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 16,
    color: "#fff",
    fontWeight: 600,
  },
  brandGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },
  brandSettingsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  uploadBox: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: "40px 20px",
    marginBottom: 16,
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  uploadLabel: {
    display: "block",
    cursor: "pointer",
    width: "100%",
  },
  uploadText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: 500,
  },
  logoPreviewContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  logoPreviewInBox: {
    maxWidth: 120,
    maxHeight: 60,
    objectFit: "contain",
    borderRadius: 6,
  },
  colorBox: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 20,
  },
  colorInputContainer: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  colorInput: {
    width: 60,
    height: 40,
    borderRadius: 6,
    border: "1px solid #222",
    cursor: "pointer",
    flexShrink: 0,
  },
  logoPreview: {
    maxWidth: 200,
    maxHeight: 80,
    marginBottom: 32,
    objectFit: "contain",
  },
  logoPreviewSmall: {
    maxWidth: 100,
    maxHeight: 40,
    marginTop: 12,
    objectFit: "contain",
    borderRadius: 4,
  },
  buttonContainer: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    maxWidth: 600,
    margin: "20px auto 0",
  },
  previewButton: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "1px solid",
    background: "transparent",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  backButton: {
    position: "fixed",
    top: 20,
    left: 20,
    padding: "12px 24px",
    borderRadius: 8,
    border: "1px solid #222",
    background: "#111",
    color: "#fff",
    fontWeight: 600,
    fontSize: 16,
    cursor: "pointer",
    zIndex: 1000,
    transition: "all 0.2s",
  },
  descriptionList: {
    listStyle: "none",
    padding: 0,
    margin: "16px 0",
    textAlign: "left",
  },
  descriptionItem: {
    padding: "8px 0",
    color: "#fff",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    color: "#fff",
    fontSize: 14,
    cursor: "pointer",
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: "pointer",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
  },
  plansHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addPlanButton: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid",
    background: "transparent",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  removePlanButton: {
    padding: "4px 8px",
    borderRadius: 4,
    border: "1px solid",
    background: "transparent",
    fontWeight: 500,
    fontSize: 11,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  menuContainer: {
    display: "flex",
    gap: 12,
    marginBottom: 30,
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    paddingBottom: 12,
  },
  menuTab: {
    padding: "10px 24px",
    borderRadius: 8,
    border: "1px solid",
    background: "transparent",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s",
  },
};
