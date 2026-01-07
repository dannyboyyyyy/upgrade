# Whop Integration Setup Guide

## Overview

This application uses Whop as the **single source of truth** for plan management and permissions. All plan access is verified through Whop's API, and permissions are strictly enforced based on the user's active plan.

## Architecture

### Permission System

The system uses a **strict permission model** where each plan has exactly its own permissions:

- **Free**: 1 plan, monthly only, "Upgrade" branding, no customization
- **Premium ($9.99)**: 2 plans, monthly & yearly, custom color, no logo, no "Upgrade" branding
- **Pro ($14.99)**: Unlimited plans, monthly & yearly, custom color + logo, no "Upgrade" branding, priority support

**Critical Rule**: No plan inherits, overlaps, or "borrows" features. All access is determined exclusively by `getPlanPermissions(plan)`.

### Flow

1. User accesses app → Whop token verified via `/api/whop/verify`
2. User's plan determined by checking Whop product access
3. Permissions calculated from plan
4. UI gated based on permissions
5. Payment handled entirely by Whop checkout

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @whop/sdk
```

### 2. Configure Environment Variables

Create `.env.local` with:

```env
# Whop Configuration (Server-only, no NEXT_PUBLIC_)
WHOP_API_KEY=your_whop_api_key
WHOP_APP_ID=your_whop_app_id

# Whop Product IDs (from Whop dashboard)
PREMIUM_PRODUCT_ID=your_premium_product_id
PRO_PRODUCT_ID=your_pro_product_id

# Whop Checkout URLs (Client-accessible)
# Use separate monthly/yearly URLs if available, or single URL that handles both
NEXT_PUBLIC_PREMIUM_MONTHLY_PURCHASE_URL=https://whop.com/checkout/xxx
NEXT_PUBLIC_PREMIUM_YEARLY_PURCHASE_URL=https://whop.com/checkout/plan_dmakmgUTWUogp
NEXT_PUBLIC_PRO_MONTHLY_PURCHASE_URL=https://whop.com/checkout/yyy
NEXT_PUBLIC_PRO_YEARLY_PURCHASE_URL=https://whop.com/checkout/yyy-yearly

# Fallback (if single URL handles both monthly and yearly)
# NEXT_PUBLIC_PREMIUM_PURCHASE_URL=https://whop.com/checkout/xxx
# NEXT_PUBLIC_PRO_PURCHASE_URL=https://whop.com/checkout/yyy

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Create Whop Products

In your Whop dashboard:

1. Create **Premium** product ($9.99/month)
   - Supports both monthly and yearly billing
   - Copy the Product ID → `PREMIUM_PRODUCT_ID`
   - Copy the monthly checkout URL → `NEXT_PUBLIC_PREMIUM_MONTHLY_PURCHASE_URL`
   - Copy the yearly checkout URL → `NEXT_PUBLIC_PREMIUM_YEARLY_PURCHASE_URL`

2. Create **Pro** product ($14.99/month)
   - Supports both monthly and yearly billing
   - Copy the Product ID → `PRO_PRODUCT_ID`
   - Copy the monthly checkout URL → `NEXT_PUBLIC_PRO_MONTHLY_PURCHASE_URL`
   - Copy the yearly checkout URL → `NEXT_PUBLIC_PRO_YEARLY_PURCHASE_URL`

### 4. Configure Whop App

In Whop App settings:

- **Required Scopes**:
  - `member:basic:read`
  - `product:basic:read`

- **Return URL**: Set to your app's callback URL (e.g., `https://yourapp.com/owner?token={token}`)

⚠️ **IMPORTANT**: After changing permissions/scopes in Whop App settings, you **MUST** re-install the app in your Whop product for changes to take effect.

⚠️ **Testing**: The app must be tested via Whop Experience, not by accessing the URL directly. Whop provides the token through the Experience flow.

### 5. How It Works

#### Authentication Flow

1. User accesses `/owner` page
2. App extracts Whop token from URL params or localStorage
3. Token sent to `/api/whop/verify`
4. API verifies token with Whop SDK
5. API checks user's access to Premium and Pro products
6. Returns plan ("free", "premium", or "pro") and permissions
7. UI updates based on permissions

#### Permission Enforcement

All UI elements check permissions:

- **Add Plan button**: Disabled if `options.length >= permissions.maxPlans`
- **Yearly toggle**: Only visible if `permissions.canUseYearly === true`
- **Brand color picker**: Only visible if `permissions.canCustomizeColor === true`
- **Logo upload**: Only visible if `permissions.canCustomizeLogo === true`
- **"Upgrade" branding**: Shown if `permissions.showUpgradeBranding === true`

#### Payment Flow

1. User clicks "Get Started" on Premium or Pro plan
2. Redirected to Whop checkout URL
3. Completes payment on Whop
4. Whop redirects back with token
5. App verifies token and updates permissions
6. User now has access to new features

## File Structure

```
app/
├── lib/
│   ├── whop-sdk.ts          # Whop SDK initialization
│   ├── getUserPlan.ts       # Checks Whop for user's plan
│   └── getPlanPermissions.ts # Maps plan to permissions
├── api/
│   └── whop/
│       └── verify/
│           └── route.ts     # API route for Whop verification
├── owner/
│   └── page.tsx             # Owner dashboard (gated by permissions)
└── upgrade/
    └── page.tsx             # Customer-facing upgrade page
```

## Testing

### Test Free Plan
- No Whop token → defaults to free
- Invalid token → defaults to free
- No product access → defaults to free

### Test Premium Plan
1. Purchase Premium product in Whop
2. Access app with Whop token
3. Verify: 2 plans max, yearly toggle visible, color picker visible, logo upload hidden

### Test Pro Plan
1. Purchase Pro product in Whop
2. Access app with Whop token
3. Verify: Unlimited plans, all features visible, no "Upgrade" branding

## Important Notes

⚠️ **Server-only variables**: `WHOP_API_KEY`, `WHOP_APP_ID`, `PREMIUM_PRODUCT_ID`, `PRO_PRODUCT_ID` must NOT use `NEXT_PUBLIC_` prefix

⚠️ **Client-accessible URLs**: Checkout URLs use `NEXT_PUBLIC_` prefix for client-side redirects

⚠️ **No fallback features**: If permission is false, feature is completely disabled

⚠️ **Whop is source of truth**: Never store plan in Supabase. Always check Whop.

## Troubleshooting

### "Cannot find module '@whop/sdk'"
Run: `npm install @whop/sdk`

### "WHOP_API_KEY is not defined"
Check `.env.local` has correct variable names (no `NEXT_PUBLIC_` prefix)

### Permissions not updating after purchase
1. Check Whop token is being passed correctly
2. Verify product IDs match Whop dashboard
3. Check API route logs for errors

### Checkout redirect not working
1. Verify `NEXT_PUBLIC_PREMIUM_MONTHLY_PURCHASE_URL` and `NEXT_PUBLIC_PRO_MONTHLY_PURCHASE_URL` are set
2. Check URLs are correct Whop checkout links
3. Ensure return URL is configured in Whop app settings

### App not working after permission changes
1. Re-install the app in your Whop product dashboard
2. Permissions/scopes changes require re-installation to take effect

### Testing the app
1. Access the app through Whop Experience (not direct URL)
2. Whop Experience provides the authentication token
3. Direct URL access will default to free plan

