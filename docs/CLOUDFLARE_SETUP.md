# Cloudflare Setup Guide for USAR ICS-212 System

**Document Version**: 1.0  
**Last Updated**: 2026-01-06  
**Status**: Phase 0 - Credentials and Service Provisioning Required

---

## Overview

This guide documents all Cloudflare services, credentials, and configuration required for the USAR ICS-212 Vehicle Inspection System. Follow this guide to provision the necessary Cloudflare infrastructure.

---

## Required Cloudflare Services

### 1. Cloudflare Workers
- **Purpose**: Edge compute for API endpoints, PDF generation, email notifications
- **Plan**: Workers Paid Plan ($5/month minimum)
- **Limits**: 10M requests/month included

### 2. R2 Object Storage
- **Purpose**: PDF storage with 7-year retention
- **Bucket Name**: `usar-ics212-forms`
- **Estimated Cost**: $2-3/month (100GB, 1M reads)
- **Retention**: 2555 days (7 years for federal compliance)

### 3. D1 Database
- **Purpose**: Form metadata, search indexes, inspection tracking
- **Database Name**: `usar-ics212-db`
- **Plan**: Free tier sufficient for MVP
- **Limits**: 5GB storage, 5M reads/day

### 4. KV Namespaces (2 required)
- **USAR_CONFIG**: Application configuration and caching
- **USAR_UPLOADS**: Temporary file uploads
- **Plan**: Free tier sufficient
- **Limits**: 1GB storage, 100K reads/day

### 5. Workers AI (Optional - Phase 2+)
- **Purpose**: Predictive maintenance, trend analysis
- **Plan**: Pay-as-you-go
- **Status**: Not required for MVP

---

## Step 1: Create Cloudflare Account

**Prerequisites**:
- [ ] Email address for account
- [ ] Credit card for paid plan
- [ ] 2FA enabled (recommended)

**Steps**:
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign up for new account
3. Enable Workers Paid Plan ($5/month)
4. Add payment method

---

## Step 2: Install Wrangler CLI

```bash
# Install globally
npm install -g wrangler

# Verify installation
wrangler --version

# Authenticate with Cloudflare
wrangler login
```

---

## Step 3: Create KV Namespaces

```bash
# Navigate to worker directory
cd worker/mbfd-github-proxy

# Create USAR_CONFIG namespace
wrangler kv namespace create "USAR_CONFIG"
# Output: Created namespace with ID: abc123...
# SAVE THIS ID

# Create USAR_UPLOADS namespace
wrangler kv namespace create "USAR_UPLOADS"
# Output: Created namespace with ID: def456...
# SAVE THIS ID
```

**Record IDs**:
- USAR_CONFIG ID: `_________________________`
- USAR_UPLOADS ID: `_________________________`

---

## Step 4: Create D1 Database

```bash
# Create database
wrangler d1 create usar-ics212-db
# Output: Created database with ID: xyz789...
# SAVE THIS ID
```

**Record ID**:
- Database ID: `_________________________`

---

## Step 5: Create R2 Bucket

```bash
# Create bucket for PDF storage
wrangler r2 bucket create usar-ics212-forms
# Output: Created bucket 'usar-ics212-forms'
```

No ID needed - bucket name is used in configuration.

---

## Step 6: Update wrangler.jsonc

Edit `worker/mbfd-github-proxy/wrangler.jsonc` and add the IDs from above:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "usar-ics212-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-01-06",
  
  // Add your KV namespace IDs here
  "kv_namespaces": [
    {
      "binding": "USAR_CONFIG",
      "id": "YOUR_CONFIG_KV_ID_HERE"
    },
    {
      "binding": "USAR_UPLOADS",
      "id": "YOUR_UPLOADS_KV_ID_HERE"
    }
  ],
  
  // Add your D1 database ID here
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "usar-ics212-db",
      "database_id": "YOUR_D1_DATABASE_ID_HERE"
    }
  ],
  
  // R2 bucket (no ID needed)
  "r2_buckets": [
    {
      "binding": "PDF_STORAGE",
      "bucket_name": "usar-ics212-forms"
    }
  ],
  
  // Rest of configuration...
}
```

---

## Step 7: Run Database Migrations

```bash
# Navigate to worker directory
cd worker/mbfd-github-proxy

# Apply migrations to create tables
wrangler d1 migrations apply usar-ics212-db
```

---

## Step 8: Set Cloudflare Secrets

**IMPORTANT**: Use the provided GitHub token and FLTF2-USAR account credentials.

```bash
# Navigate to worker directory
cd worker/mbfd-github-proxy

# GitHub Configuration (MUST USE FLTF2-USAR CREDENTIALS)
echo "YOUR_GITHUB_TOKEN_HERE" | wrangler secret put GITHUB_TOKEN
echo "FLTF2-USAR" | wrangler secret put GITHUB_OWNER
echo "usar-ics212-system" | wrangler secret put GITHUB_REPO

# Admin Dashboard Password (CREATE A STRONG PASSWORD)
echo "YOUR_SECURE_PASSWORD_HERE" | wrangler secret put ADMIN_PASSWORD

# Gmail OAuth Credentials (TO BE PROVIDED)
echo "YOUR_CLIENT_ID" | wrangler secret put GMAIL_CLIENT_ID
echo "YOUR_CLIENT_SECRET" | wrangler secret put GMAIL_CLIENT_SECRET
echo "YOUR_REFRESH_TOKEN" | wrangler secret put GMAIL_REFRESH_TOKEN
echo "usarforms@gmail.com" | wrangler secret put GMAIL_FROM

# Google Sheets Service Account (OPTIONAL - Phase 2+)
cat /path/to/service-account-key.json | tr -d '\n' | wrangler secret put GOOGLE_SA_KEY
echo "YOUR_SHEET_ID" | wrangler secret put GOOGLE_SHEET_ID
```

---

## Step 9: Deploy Worker

```bash
# Build and deploy
cd worker/mbfd-github-proxy
wrangler deploy

# Output will show:
# ✨ Published usar-ics212-worker
#    https://usar-ics212-worker.YOUR_ACCOUNT.workers.dev
```

**SAVE YOUR WORKER URL**: `_________________________________________________`

---

## Step 10: Test Deployment

```bash
# Test health endpoint
curl https://usar-ics212-worker.YOUR_ACCOUNT.workers.dev/api/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2026-01-06T...",
#   "version": "1.0.0"
# }
```

---

## Required Credentials Checklist

### ✅ Completed (Phase 0)
- [x] Cloudflare account created
- [x] Workers Paid Plan activated
- [x] Wrangler CLI installed and authenticated
- [ ] KV namespaces created
- [ ] D1 database created
- [ ] R2 bucket created
- [ ] GitHub token configured (FLTF2-USAR)

### 🔄 Pending User Action
- [ ] **Gmail OAuth Credentials** (user must provide)
  - Client ID
  - Client Secret
  - Refresh Token
  - Sender email address
- [ ] **Admin Password** (user must create)
- [ ] **Google Sheets Service Account** (optional, Phase 2+)

---

## Cost Breakdown

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Cloudflare Workers | $5 | Paid plan required |
| R2 Storage | $2-3 | 100GB + 1M reads |
| D1 Database | $0 | Free tier |
| KV Namespaces | $0 | Free tier |
| **Total** | **$7-10/month** | Scales with usage |

---

## Security Best Practices

1. **Rotate Credentials Regularly**
   - GitHub token: Every 90 days
   - Admin password: Every 60 days
   - Gmail refresh token: Annually

2. **Use Strong Passwords**
   - Minimum 16 characters
   - Mix of uppercase, lowercase, numbers, symbols

3. **Enable 2FA**
   - Cloudflare account
   - GitHub account
   - Google account

4. **Backup Secrets Securely**
   - Use password manager (1Password, LastPass)
   - Store encrypted offline backup
   - Never commit secrets to Git

5. **Monitor API Usage**
   - Check Cloudflare analytics weekly
   - Set up usage alerts
   - Review GitHub API rate limits

---

## Troubleshooting

### Issue: Wrangler login fails
**Solution**:
```bash
# Try manual token method
wrangler login --scopes-list
# Set CLOUDFLARE_API_TOKEN in environment
```

### Issue: KV namespace not found
**Solution**: Verify IDs in wrangler.jsonc match created namespaces
```bash
wrangler kv namespace list
```

### Issue: D1 migrations fail
**Solution**: Try local first, then remote
```bash
wrangler d1 migrations apply usar-ics212-db --local
wrangler d1 migrations apply usar-ics212-db --remote
```

### Issue: R2 bucket access denied
**Solution**: Verify bucket exists and binding name matches
```bash
wrangler r2 bucket list
```

---

## Next Steps

Once Cloudflare provisioning is complete:

1. ✅ Update `wrangler.jsonc` with all IDs
2. ✅ Set all required secrets
3. ✅ Deploy worker and verify health endpoint
4. ✅ Configure Gmail OAuth (see Gmail setup guide)
5. 🔄 Begin Phase 1 development (Core Form MVP)

---

## Related Documentation

- [Step-by-Step Migration Guide](../mbfd-checkout-system/usar-ics212-architecture/08-migration-strategy/step-by-step-guide.md)
- [Configuration Mapping](../mbfd-checkout-system/usar-ics212-architecture/08-migration-strategy/configuration-mapping.md)
- [Implementation Roadmap](../mbfd-checkout-system/usar-ics212-architecture/10-implementation-roadmap/IMPLEMENTATION-ROADMAP.md)

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-06  
**Status**: Ready for User to Provision Cloudflare Services
