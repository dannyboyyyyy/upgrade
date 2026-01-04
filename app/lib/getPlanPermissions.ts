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

/**
 * Plan rules - single source of truth for all plan permissions
 */
const PLAN_RULES = {
  free: {
    maxPlans: 1,
    allowYearly: false,
    showUpgradeBranding: true,
    customBrandColor: false,
    prioritySupport: false,
  },
  premium: {
    maxPlans: 2,
    allowYearly: false, // ⛔ yearly explicitly disabled
    showUpgradeBranding: false,
    customBrandColor: true,
    prioritySupport: false,
  },
  pro: {
    maxPlans: Infinity,
    allowYearly: true,
    showUpgradeBranding: false,
    customBrandColor: true,
    prioritySupport: true,
  },
} as const;

export function getPlanPermissions(plan: "free" | "premium" | "pro"): PlanPermissions {
  const rules = PLAN_RULES[plan];
  
  return {
    plan,
    maxPlans: rules.maxPlans,
    canUseMonthly: true, // All plans support monthly
    canUseYearly: rules.allowYearly,
    showUpgradeBranding: rules.showUpgradeBranding,
    canCustomizeColor: rules.customBrandColor,
    canCustomizeLogo: false, // Logo customization not available on any plan (reserved for future)
    hasPrioritySupport: rules.prioritySupport,
  };
}

