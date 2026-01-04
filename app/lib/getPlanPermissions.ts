export type PlanPermissions = {
  plan: "free" | "premium" | "pro";
  maxPlans: number;
  canUseMonthly: boolean;
  canUseYearly: boolean;
  showUpgradeBranding: boolean;
  canCustomizeColor: boolean;
  canCustomizeLogo: boolean;
  hasPrioritySupport: boolean;
};

export function getPlanPermissions(plan: "free" | "premium" | "pro"): PlanPermissions {
  if (plan === "pro") {
    return {
      plan: "pro",
      maxPlans: Infinity,
      canUseMonthly: true,
      canUseYearly: true,
      showUpgradeBranding: false,
      canCustomizeColor: true,
      canCustomizeLogo: true,
      hasPrioritySupport: true,
    };
  }

  if (plan === "premium") {
    return {
      plan: "premium",
      maxPlans: 2,
      canUseMonthly: true,
      canUseYearly: true,
      showUpgradeBranding: false,
      canCustomizeColor: true,
      canCustomizeLogo: false,
      hasPrioritySupport: false,
    };
  }

  // Free plan - strict permissions only
  return {
    plan: "free",
    maxPlans: 1,
    canUseMonthly: true,
    canUseYearly: false,
    showUpgradeBranding: true,
    canCustomizeColor: false,
    canCustomizeLogo: false,
    hasPrioritySupport: false,
  };
}

