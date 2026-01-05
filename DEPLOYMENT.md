# Deployment Guide - Whop Embedded App

This guide explains how to deploy the Whop embedded app using Git and Vercel.

## Prerequisites

- Git repository set up (GitHub, GitLab, or Bitbucket)
- Vercel account (free tier works)
- Whop app configured with your app URL
- Environment variables ready

## Step-by-Step Deployment

### 1. Prepare Your Code

Ensure all changes are committed:

```bash
cd /Users/danielstomner/Desktop/Upgrade/upgrade
git add .
git commit -m "Refactor: Single entry point architecture with inline owner configuration"
```

### 2. Push to Git Repository

If you haven't already, initialize and push to your remote repository:

```bash
# If repository doesn't exist yet
git remote add origin <your-repo-url>
git push -u origin main

# If repository already exists
git push origin main
```

### 3. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Sign in or create an account

2. **Import Your Project**
   - Click "Add New..." → "Project"
   - Import your Git repository
   - Select the repository containing your app

3. **Configure Project Settings**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `upgrade` (if your Next.js app is in a subdirectory)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

4. **Set Environment Variables**
   
   Add the following environment variables in Vercel dashboard:
   
   **Whop Configuration (Server-only):**
   ```
   WHOP_API_KEY=your_whop_api_key
   WHOP_APP_ID=your_whop_app_id
   PREMIUM_PRODUCT_ID=your_premium_product_id
   PRO_PRODUCT_ID=your_pro_product_id
   ```
   
   **Whop Checkout URLs (Client-accessible):**
   ```
   NEXT_PUBLIC_PREMIUM_MONTHLY_PURCHASE_URL=https://whop.com/checkout/xxx
   NEXT_PUBLIC_PREMIUM_YEARLY_PURCHASE_URL=https://whop.com/checkout/xxx-yearly
   NEXT_PUBLIC_PRO_MONTHLY_PURCHASE_URL=https://whop.com/checkout/yyy
   NEXT_PUBLIC_PRO_YEARLY_PURCHASE_URL=https://whop.com/checkout/yyy-yearly
   ```
   
   **Supabase Configuration:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   
   **App URL (for server-side API calls):**
   ```
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```
   
   ⚠️ **Important**: After setting `NEXT_PUBLIC_APP_URL`, you'll need to redeploy for it to take effect.

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (usually 1-3 minutes)

#### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd /Users/danielstomner/Desktop/Upgrade/upgrade
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Set root directory: `upgrade` (if prompted)
   - Confirm environment variables

4. **Set Environment Variables via CLI** (if not set in dashboard)
   ```bash
   vercel env add WHOP_API_KEY
   vercel env add WHOP_APP_ID
   vercel env add PREMIUM_PRODUCT_ID
   vercel env add PRO_PRODUCT_ID
   vercel env add NEXT_PUBLIC_PREMIUM_MONTHLY_PURCHASE_URL
   vercel env add NEXT_PUBLIC_PREMIUM_YEARLY_PURCHASE_URL
   vercel env add NEXT_PUBLIC_PRO_MONTHLY_PURCHASE_URL
   vercel env add NEXT_PUBLIC_PRO_YEARLY_PURCHASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add NEXT_PUBLIC_APP_URL
   ```

### 4. Configure Whop App Settings

After deployment, update your Whop app settings:

1. **Go to Whop Dashboard** → Your App → Settings
2. **Set App URL**: `https://your-app.vercel.app`
3. **Set Return URL**: `https://your-app.vercel.app/upgrade?token={token}`
4. **Required Scopes**:
   - `member:basic:read`
   - `product:basic:read`

### 5. Test Deployment

1. **Visit your deployed app**: `https://your-app.vercel.app/upgrade`
2. **Test as Member**: Should see upgrade page without configuration UI
3. **Test as Owner**: Should see "Configure Plans" button that opens modal
4. **Test /owner route**: Should redirect non-owners to /upgrade

### 6. Enable Automatic Deployments

Vercel automatically deploys on every push to your main branch:

1. **Go to Vercel Dashboard** → Your Project → Settings → Git
2. **Production Branch**: Set to `main` (or your default branch)
3. **Auto-deploy**: Enabled by default

Now every `git push` will trigger a new deployment automatically.

## Troubleshooting

### Build Errors

- **"Cannot find module"**: Ensure `package.json` has all dependencies
- **"Environment variable not found"**: Check all env vars are set in Vercel
- **"Headers() is not a function"**: Ensure Next.js version is 15+ (headers() is async)

### Runtime Errors

- **"isOwner always false"**: Check `NEXT_PUBLIC_APP_URL` is set correctly
- **"Token not found"**: Verify Whop is passing token in headers
- **"API route 500 error"**: Check server-side environment variables

### Common Issues

1. **Server-side API calls failing**: 
   - Ensure `NEXT_PUBLIC_APP_URL` matches your Vercel deployment URL
   - Check that internal API routes are accessible

2. **Ownership check not working**:
   - Verify `/api/whop/me` route is working
   - Check Whop token is being passed correctly
   - Ensure `WHOP_API_KEY` is set in Vercel

3. **Modal not opening**:
   - Check browser console for errors
   - Verify `isOwner` is `true` in server component
   - Check that `OwnerConfigModal` component is imported correctly

## Production Checklist

- [ ] All environment variables set in Vercel
- [ ] `NEXT_PUBLIC_APP_URL` matches deployment URL
- [ ] Whop app URL configured in Whop dashboard
- [ ] Tested as member (no config UI visible)
- [ ] Tested as owner (config UI accessible)
- [ ] `/owner` route redirects non-owners
- [ ] Plans save correctly to Supabase
- [ ] Brand settings update correctly

## Architecture Notes

This app uses a **single entry point architecture**:

- **ALL users** (owners + members) load `/upgrade`
- **Owners** see "Configure Plans" button that opens inline modal
- **Members** never see configuration UI
- **`/owner` route** is optional/legacy, server-side protected

This architecture ensures the app works regardless of how Whop loads it (iframe, direct link, Admin → Apps).

## Support

For issues:
- Check Vercel deployment logs
- Check browser console for client errors
- Verify environment variables are set correctly
- Test API routes directly: `/api/whop/me` and `/api/whop/verify`

