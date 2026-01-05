# Deployment Guide - Whop Upgrade App

This guide explains how to deploy the Whop embedded Next.js app to Vercel using Git.

## Prerequisites

1. **Git repository** - Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)
2. **Vercel account** - Sign up at [vercel.com](https://vercel.com) if you don't have one
3. **Environment variables** - All required environment variables configured

## Step 1: Push Code to Git Repository

If you haven't already, initialize and push your code:

```bash
# Navigate to project directory
cd /Users/danielstomner/Desktop/Upgrade/upgrade

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: Whop upgrade app with server-side routing"

# Add remote repository (replace with your repo URL)
git remote add origin https://github.com/yourusername/your-repo.git

# Push to remote
git push -u origin main
```

## Step 2: Connect Repository to Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Sign in or create an account

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select your Git provider (GitHub, GitLab, or Bitbucket)
   - Authorize Vercel to access your repositories
   - Select your repository from the list

3. **Configure Project**
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `upgrade` (if your Next.js app is in a subdirectory)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

## Step 3: Configure Environment Variables

In the Vercel project settings, add all required environment variables:

### Required Environment Variables

```env
# Whop Configuration (Server-only)
WHOP_API_KEY=your_whop_api_key
WHOP_APP_ID=your_whop_app_id

# Whop Product IDs
PREMIUM_PRODUCT_ID=your_premium_product_id
PRO_PRODUCT_ID=your_pro_product_id

# Whop Checkout URLs (Client-accessible)
NEXT_PUBLIC_PREMIUM_MONTHLY_PURCHASE_URL=https://whop.com/checkout/xxx
NEXT_PUBLIC_PREMIUM_YEARLY_PURCHASE_URL=https://whop.com/checkout/xxx-yearly
NEXT_PUBLIC_PRO_MONTHLY_PURCHASE_URL=https://whop.com/checkout/yyy
NEXT_PUBLIC_PRO_YEARLY_PURCHASE_URL=https://whop.com/checkout/yyy-yearly

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App URL (for server-side API calls)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**To add environment variables in Vercel:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each variable with its value
4. Select environments (Production, Preview, Development)
5. Click "Save"

## Step 4: Deploy

1. **Automatic Deployment**
   - After connecting the repository, Vercel will automatically deploy
   - You'll see the deployment progress in the dashboard
   - Once complete, you'll get a deployment URL (e.g., `https://your-app.vercel.app`)

2. **Manual Deployment** (if needed)
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login to Vercel
   vercel login

   # Deploy
   vercel

   # Deploy to production
   vercel --prod
   ```

## Step 5: Configure Whop App Settings

1. **Update App URL in Whop Dashboard**
   - Go to your Whop app settings
   - Set the app URL to your Vercel deployment URL: `https://your-app.vercel.app`
   - Ensure the app is configured to load at `/upgrade` or `/owner` as needed

2. **Verify Permissions**
   - Ensure your Whop app has the required permissions:
     - `company:basic:read` (required)
     - `company:authorized_user:read` (required)
     - `member:basic:read` (optional)

## Step 6: Test Deployment

1. **Test Owner Access**
   - Log in as a Whop owner/admin
   - Access the app via Whop
   - Verify you're redirected to `/owner`
   - Verify you can configure plans

2. **Test Member Access**
   - Log in as a Whop member
   - Access the app via Whop
   - Verify you're redirected to `/upgrade`
   - Verify you can see upgrade plans but NOT configuration UI

3. **Test Direct URL Access**
   - As a member, try accessing `/owner` directly
   - Verify you're redirected to `/upgrade`
   - As an owner, try accessing `/upgrade` directly
   - Verify you're redirected to `/owner`

## Step 7: Continuous Deployment

Vercel automatically deploys on every push to your main branch:

```bash
# Make changes
git add .
git commit -m "Update app"
git push origin main

# Vercel will automatically deploy
```

## Troubleshooting

### Build Failures

1. **Check build logs** in Vercel dashboard
2. **Verify environment variables** are set correctly
3. **Check Node.js version** (should be 18.x or higher)
4. **Verify dependencies** are in `package.json`

### Routing Issues

1. **Verify `NEXT_PUBLIC_APP_URL`** is set to your Vercel deployment URL
2. **Check server-side logs** in Vercel function logs
3. **Verify Whop token** is being passed in headers

### Owner Detection Issues

1. **Check Whop API key** and app ID are correct
2. **Verify user has "owner" or "admin" role** in Whop
3. **Check server logs** for ownership check errors

## Security Notes

- **Never commit** `.env.local` or environment variables to Git
- **Use Vercel environment variables** for all secrets
- **Server-side routing** ensures members can never access `/owner`
- **Ownership checks** are enforced server-side, not client-side

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Whop SDK Documentation](https://docs.whop.com)
