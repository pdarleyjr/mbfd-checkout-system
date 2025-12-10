# MBFD Checkout System - Administrator Setup Guide

## Overview

This system uses a **single GitHub Personal Access Token** that is embedded into the application during the automated build process. Users **DO NOT need to configure any tokens** - they simply use the app.

---

## One-Time Setup (Administrator Only)

### Step 1: Create a GitHub Personal Access Token

1. Go to **GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens**
   - Direct link: https://github.com/settings/tokens?type=beta

2. Click **"Generate new token"**

3. Configure the token:
   - **Token name**: `MBFD Checkout System`
   - **Expiration**: Choose based on your security policy (recommend 1 year)
   - **Repository access**: Select "Only select repositories"
   - Choose: `pdarleyjr/mbfd-checkout-system`
   
4. **Repository permissions:**
   - **Issues**: Read and write ✅
   - Leave all other permissions as "No access"

5. Click **"Generate token"**

6. **COPY THE TOKEN** - You won't see it again!
   - Format: `github_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### Step 2: Add Token to Repository Secrets

1. Go to your repository: https://github.com/pdarleyjr/mbfd-checkout-system

2. Click **Settings** (repository settings, not your account)

3. In the left sidebar, click **Secrets and variables → Actions**

4. Click **"New repository secret"**

5. Create the secret:
   - **Name**: `MBFD_GITHUB_TOKEN` (EXACTLY this name)
   - **Value**: Paste the token you copied in Step 1
   - Click **"Add secret"**

### Step 3: Trigger the First Deployment

The GitHub Actions workflow will automatically build and deploy when you push to the `main` branch.

**Option A - Push your changes:**
```bash
cd mbfd-checkout-system
git add .
git commit -m "Configure automated deployment with embedded token"
git push origin main
```

**Option B - Manual workflow trigger:**
1. Go to **Actions** tab in your repository
2. Click **"Build and Deploy"** workflow
3. Click **"Run workflow"** → **"Run workflow"**

### Step 4: Verify Deployment

1. Wait 2-3 minutes for the build to complete
2. Visit: https://pdarleyjr.github.io/mbfd-checkout-system/
3. You should see the login screen **without any token warnings**
4. Enter a name, select rank/apparatus, and start an inspection

---

## How It Works

1. **GitHub Actions** runs on every push to `main`
2. During build, it injects the token from `MBFD_GITHUB_TOKEN` secret
3. The token is **embedded directly into the JavaScript bundle**
4. Users access the deployed site and the token is already configured
5. All API calls to GitHub Issues work transparently

---

## Security Notes

- The token is **read-only visible** in the browser's compiled JavaScript
- This is acceptable for an **internal departmental tool**
- The token is **scoped only to this repository** and **only to Issues**
- Even if exposed, it cannot access other repos or perform dangerous operations
- For higher security needs, consider a proper backend service

---

## User Instructions (For Firefighters)

**NO SETUP REQUIRED!** Just:

1. Visit https://pdarleyjr.github.io/mbfd-checkout-system/
2. Enter your name
3. Select your rank
4. Select your apparatus
5. Click "Start Inspection"
6. Follow the step-by-step checklist

---

## Troubleshooting

### "GitHub token not configured" Error

If users see this error, it means the deployment failed or the secret wasn't set correctly.

**Solution:**
1. Verify the secret exists: Settings → Secrets and variables → Actions
2. Ensure it's named **EXACTLY**: `MBFD_GITHUB_TOKEN`
3. Re-run the deployment: Actions → Build and Deploy → Run workflow

### Deployment Not Triggering

**Solution:**
```bash
# Force a new commit
git commit --allow-empty -m "Trigger deployment"
git push origin main
```

### Token Expired

**Solution:**
1. Create a new token (follow Step 1)
2. Update the secret (follow Step 2)
3. Push a new commit to trigger rebuild

---

## Admin Dashboard Access

Admins can view and resolve defects:
- Visit: https://pdarleyjr.github.io/mbfd-checkout-system/admin
- See fleet status and all open defects
- Click "Resolve" to close defects

---

## Support

For technical issues, contact the repository administrator or file an issue on GitHub.