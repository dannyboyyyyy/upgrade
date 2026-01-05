"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { PlanPermissions } from "../lib/getPlanPermissions";

const OWNER_ID = "whop-app";

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

interface OwnerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandColor: string;
}

/**
 * Owner Configuration Modal
 * 
 * Plan configuration is only available to Whop owners/admins and rendered inline on /upgrade 
 * to avoid routing issues caused by iframe mounting.
 * 
 * This modal provides the same configuration capabilities as /owner but is embedded
 * directly in the /upgrade page, ensuring it works regardless of how Whop loads the app.
 * 
 * Security: Ownership is verified server-side before this component is rendered.
 * Members must NEVER see this UI, markup, or hints.
 */
export function OwnerConfigModal({ isOpen, onClose, brandColor }: OwnerConfigModalProps) {
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
    brand_color: brandColor,
  });
  const [activeTab, setActiveTab] = useState<"plans" | "designing">("plans");

  // Load owner permissions and existing data
  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      try {
        // Get Whop token
        const urlParams = new URLSearchParams(window.location.search);
        const whopToken = urlParams.get("token") || localStorage.getItem("whop_token");

        // Get plan permissions
        const response = await fetch("/api/whop/verify", {
          headers: {
            "x-whop-user-token": whopToken || "",
            "x-whop-token": whopToken || "",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPlan(data.plan);
          setPermissions(data.permissions);
          setIsYearly(data.permissions.canUseYearly);
        }

        // Load existing plans and brand settings
        const { data, error: fetchError } = await supabase
          .from("upgrade_sections")
          .select("*")
          .eq("owner_id", OWNER_ID)
          .single();

        if (!fetchError && data) {
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
            setOptions(transformedOptions);
          }

          if (data.brand_settings) {
            setBrandSettings({
              logo_url: data.brand_settings.logo_url || "",
              brand_color: data.brand_settings.brand_color || data.brand_settings.primary_color || brandColor,
            });
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };

    load();
  }, [isOpen, brandColor]);

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
  };

  const handleRemovePlan = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const validOptions = options.filter((opt) => opt.title && opt.title.trim() !== "");
      
      if (validOptions.length === 0) {
        throw new Error("Please add at least one plan with a title");
      }

      const hasInvalidData = validOptions.some(
        (opt) => !opt.monthly_checkout_url && !opt.yearly_checkout_url
      );
      if (hasInvalidData) {
        throw new Error(
          "Please fill in at least one checkout URL (monthly or yearly) for each plan with a title"
        );
      }

      const upgradesWithPrice = validOptions.map((opt) => ({
        title: opt.title || "",
        plan_description: opt.plan_description || "",
        monthly_price: opt.monthly_price || 0,
        yearly_price: opt.yearly_price || 0,
        monthly_checkout_url: opt.monthly_checkout_url || "",
        yearly_checkout_url: opt.yearly_checkout_url || "",
        description: opt.description.filter((d) => d.trim() !== ""),
        is_featured: opt.is_featured || false,
        price: opt.monthly_price || 0,
        checkout_url: opt.monthly_checkout_url || opt.yearly_checkout_url || "",
      }));

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
        throw new Error(`Save failed: ${upsertError.message}`);
      }

      // Save brand settings separately
      try {
        await supabase
          .from("upgrade_sections")
          .update({ brand_settings: brandSettings })
          .eq("owner_id", OWNER_ID);
      } catch (err) {
        console.warn("Brand settings update failed:", err);
      }

      alert("Plans saved successfully!");
      window.location.reload(); // Reload to show changes
    } catch (err: any) {
      setError(err?.message || "Failed to save plans");
      alert(`Error saving plans: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(10px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: "#0b0b0b",
          borderRadius: 16,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          maxWidth: 1200,
          maxHeight: "90vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: 20, borderBottom: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#fff", margin: 0 }}>Configure Plans</h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 24,
              width: 32,
              height: 32,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <button
            onClick={() => setActiveTab("plans")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid",
              background: activeTab === "plans" ? brandSettings.brand_color : "transparent",
              color: activeTab === "plans" ? "#fff" : brandSettings.brand_color,
              borderColor: brandSettings.brand_color,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Plans
          </button>
          <button
            onClick={() => setActiveTab("designing")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid",
              background: activeTab === "designing" ? brandSettings.brand_color : "transparent",
              color: activeTab === "designing" ? "#fff" : brandSettings.brand_color,
              borderColor: brandSettings.brand_color,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Branding
          </button>
        </div>

        {/* Content - Scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {activeTab === "plans" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: 0 }}>Plans ({options.length})</h3>
                <button
                  onClick={handleAddPlan}
                  disabled={options.length >= permissions.maxPlans}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: `1px solid ${brandSettings.brand_color}`,
                    background: options.length >= permissions.maxPlans ? "transparent" : "transparent",
                    color: brandSettings.brand_color,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: options.length >= permissions.maxPlans ? "not-allowed" : "pointer",
                    opacity: options.length >= permissions.maxPlans ? 0.5 : 1,
                  }}
                >
                  + Add Plan
                </button>
              </div>

              {permissions.canUseYearly && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <span style={{ color: "#fff", fontSize: 14 }}>Enable Yearly Plans:</span>
                  <label style={{ position: "relative", display: "inline-block", width: 50, height: 26, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isYearly}
                      onChange={(e) => setIsYearly(e.target.checked)}
                      style={{ display: "none" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: isYearly ? brandSettings.brand_color : "#222",
                        borderRadius: 13,
                        transition: "background 0.3s",
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
                          left: isYearly ? 27 : 3,
                          transition: "left 0.3s",
                        }}
                      />
                    </span>
                  </label>
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {options.map((opt, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 12,
                      padding: 16,
                      width: "100%",
                      maxWidth: 350,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: 0 }}>Plan {i + 1}</h4>
                      {options.length > 1 && (
                        <button
                          onClick={() => handleRemovePlan(i)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            border: `1px solid ${brandSettings.brand_color}`,
                            background: "transparent",
                            color: brandSettings.brand_color,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      placeholder="Plan title"
                      value={opt.title}
                      onChange={(e) => {
                        const copy = [...options];
                        copy[i].title = e.target.value;
                        setOptions(copy);
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        marginBottom: 8,
                        borderRadius: 6,
                        border: "1px solid #222",
                        background: "#0b0b0b",
                        color: "#fff",
                        fontSize: 13,
                      }}
                    />

                    <input
                      placeholder="Plan description"
                      value={opt.plan_description}
                      onChange={(e) => {
                        const copy = [...options];
                        copy[i].plan_description = e.target.value;
                        setOptions(copy);
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        marginBottom: 8,
                        borderRadius: 6,
                        border: "1px solid #222",
                        background: "#0b0b0b",
                        color: "#fff",
                        fontSize: 13,
                      }}
                    />

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <input
                          type="checkbox"
                          checked={opt.is_featured}
                          onChange={(e) => {
                            const copy = [...options];
                            if (e.target.checked) {
                              copy.forEach((o, idx) => {
                                copy[idx].is_featured = idx === i;
                              });
                            } else {
                              copy[i].is_featured = false;
                            }
                            setOptions(copy);
                          }}
                        />
                        <span style={{ color: "#fff", fontSize: 12 }}>Featured plan</span>
                      </label>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ color: brandSettings.brand_color, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>MONTHLY</label>
                      <input
                        placeholder="Monthly price"
                        type="number"
                        value={opt.monthly_price || ""}
                        onChange={(e) => {
                          const copy = [...options];
                          copy[i].monthly_price = Number(e.target.value);
                          setOptions(copy);
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          marginBottom: 8,
                          borderRadius: 6,
                          border: "1px solid #222",
                          background: "#0b0b0b",
                          color: "#fff",
                          fontSize: 13,
                        }}
                      />
                      <input
                        placeholder="Monthly checkout URL"
                        value={opt.monthly_checkout_url}
                        onChange={(e) => {
                          const copy = [...options];
                          copy[i].monthly_checkout_url = e.target.value;
                          setOptions(copy);
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          marginBottom: 8,
                          borderRadius: 6,
                          border: "1px solid #222",
                          background: "#0b0b0b",
                          color: "#fff",
                          fontSize: 13,
                        }}
                      />
                    </div>

                    {permissions.canUseYearly && (isYearly || plan !== "free") && (
                      <div>
                        <label style={{ color: brandSettings.brand_color, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>YEARLY</label>
                        <input
                          placeholder="Yearly price"
                          type="number"
                          value={opt.yearly_price || ""}
                          onChange={(e) => {
                            const copy = [...options];
                            copy[i].yearly_price = Number(e.target.value);
                            setOptions(copy);
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            marginBottom: 8,
                            borderRadius: 6,
                            border: "1px solid #222",
                            background: "#0b0b0b",
                            color: "#fff",
                            fontSize: 13,
                          }}
                        />
                        <input
                          placeholder="Yearly checkout URL"
                          value={opt.yearly_checkout_url}
                          onChange={(e) => {
                            const copy = [...options];
                            copy[i].yearly_checkout_url = e.target.value;
                            setOptions(copy);
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            marginBottom: 8,
                            borderRadius: 6,
                            border: "1px solid #222",
                            background: "#0b0b0b",
                            color: "#fff",
                            fontSize: 13,
                          }}
                        />
                      </div>
                    )}

                    <div style={{ marginTop: 12 }}>
                      <label style={{ color: brandSettings.brand_color, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>FEATURES (up to 5)</label>
                      {opt.description.map((desc, idx) => (
                        <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <input
                            placeholder={`Feature ${idx + 1}`}
                            value={desc}
                            onChange={(e) => {
                              const copy = [...options];
                              copy[i].description[idx] = e.target.value;
                              setOptions(copy);
                            }}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              borderRadius: 6,
                              border: "1px solid #222",
                              background: "#0b0b0b",
                              color: "#fff",
                              fontSize: 13,
                            }}
                          />
                          <button
                            onClick={() => {
                              const copy = [...options];
                              copy[i].description = copy[i].description.filter((_, dIdx) => dIdx !== idx);
                              setOptions(copy);
                            }}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 6,
                              border: "1px solid #222",
                              background: "transparent",
                              color: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {opt.description.length < 5 && (
                        <button
                          onClick={() => {
                            const copy = [...options];
                            copy[i].description.push("");
                            setOptions(copy);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: `1px solid ${brandSettings.brand_color}`,
                            background: "transparent",
                            color: brandSettings.brand_color,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          + Add Feature
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "designing" && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 16 }}>Brand Settings</h3>
              
              {permissions.canCustomizeColor && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#fff", fontWeight: 500 }}>Brand Color</label>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <input
                      type="color"
                      value={brandSettings.brand_color}
                      onChange={(e) => {
                        setBrandSettings({ ...brandSettings, brand_color: e.target.value });
                      }}
                      style={{
                        width: 60,
                        height: 40,
                        borderRadius: 6,
                        border: "1px solid #222",
                        cursor: "pointer",
                      }}
                    />
                    <input
                      placeholder="#ff7a00"
                      value={brandSettings.brand_color}
                      onChange={(e) => {
                        setBrandSettings({ ...brandSettings, brand_color: e.target.value });
                      }}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #222",
                        background: "#0b0b0b",
                        color: "#fff",
                        fontSize: 13,
                      }}
                    />
                  </div>
                </div>
              )}

              {permissions.canCustomizeLogo && (
                <div>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#fff", fontWeight: 500 }}>Logo</label>
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
                  <label
                    htmlFor="logo-upload"
                    style={{
                      display: "block",
                      padding: "40px 20px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 12,
                      textAlign: "center",
                      cursor: "pointer",
                    }}
                  >
                    {brandSettings.logo_url ? (
                      <div>
                        <img
                          src={brandSettings.logo_url}
                          alt="Logo preview"
                          style={{ maxWidth: 120, maxHeight: 60, objectFit: "contain", marginBottom: 12 }}
                        />
                        <div style={{ color: "#fff", fontSize: 14 }}>Change Logo</div>
                      </div>
                    ) : (
                      <div style={{ color: "#fff", fontSize: 14 }}>Upload Logo</div>
                    )}
                  </label>
                </div>
              )}

              {!permissions.canCustomizeColor && !permissions.canCustomizeLogo && (
                <p style={{ color: "#666", fontSize: 14 }}>
                  Upgrade to Premium ($9.99) or Pro ($14.99) to customize your branding
                </p>
              )}
            </div>
          )}

          {error && (
            <div style={{ padding: 12, background: "rgba(255, 0, 0, 0.1)", border: "1px solid rgba(255, 0, 0, 0.3)", borderRadius: 8, marginTop: 16 }}>
              <p style={{ color: "#ff4444", fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: 20, borderTop: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: "transparent",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: brandSettings.brand_color,
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save Plans"}
          </button>
        </div>
      </div>
    </div>
  );
}

