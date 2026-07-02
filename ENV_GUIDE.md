# AgriConnect Environment Variables Guide

## Overview
This document provides a complete reference for all environment variables required to run the AgriConnect platform. The application is a full-stack e-commerce platform built with Express, PostgreSQL, and Drizzle ORM.

---

## REQUIRED ENVIRONMENT VARIABLES

### 1. Database Configuration
**Variable:** `DATABASE_URL`
- **Type:** String (PostgreSQL connection string)
- **Required:** YES
- **Description:** PostgreSQL database connection URL
- **Format:** `postgresql://[user]:[password]@[host]:[port]/[database]`
- **Example:** `postgresql://postgres:password123@localhost:5432/agriconnect`
- **Where to get it:**
  - Local development: Set up a PostgreSQL server locally
  - Production: Use managed PostgreSQL service (AWS RDS, Azure Database for PostgreSQL, Railway, Render, etc.)
- **SSL Configuration:** Automatically enabled for non-localhost connections

### 2. Application Environment
**Variable:** `NODE_ENV`
- **Type:** String (`development` | `production`)
- **Required:** YES
- **Default:** development (in scripts)
- **Description:** Controls whether the app runs in development or production mode
- **Impact:** 
  - `development`: Serves Vite dev server, enables hot reload
  - `production`: Serves pre-built static files
- **For Live:** Set to `production`

### 3. Server Port
**Variable:** `PORT`
- **Type:** Number
- **Required:** NO (defaults to 5000)
- **Description:** HTTP server port
- **Default:** 5000
- **For Live:** Typically 80 (with reverse proxy) or 3000+

---

## AUTHENTICATION VARIABLES (REQUIRED)

### 4. Session Secret
**Variable:** `SESSION_SECRET`
- **Type:** String (random, preferably 32+ characters)
- **Required:** YES
- **Description:** Secret key for express-session to sign session cookies
- **Security:** Must be different for each environment
- **Generate:** `openssl rand -base64 32`
- **Impact:** Changing this will invalidate all existing sessions

### 5. Replit Application ID
**Variable:** `REPL_ID`
- **Type:** String
- **Required:** YES (for Replit-based deployments)
- **Description:** Your Replit project's unique identifier
- **Where to get it:** Replit project settings → Project settings → ID
- **Used for:** OpenID Connect (OIDC) authentication integration

### 6. OIDC Issuer URL (Optional)
**Variable:** `ISSUER_URL`
- **Type:** String (URL)
- **Required:** NO
- **Default:** `https://replit.com/oidc`
- **Description:** Custom OIDC issuer URL (advanced)
- **Use case:** When using different identity providers or proxies

---

## PAYMENT PROCESSING - STRIPE (REQUIRED)

### 7. Stripe Secret Key
**Variable:** `STRIPE_SECRET_KEY`
- **Type:** String
- **Required:** YES (for payment processing)
- **Description:** Your Stripe account's secret API key
- **Where to get it:** https://dashboard.stripe.com/apikeys
- **Prefix:** `sk_test_` (test) or `sk_live_` (production)
- **Security:** Never expose in frontend code
- **Used for:** Processing payments, refunds, webhooks

### 8. Stripe Webhook Secret
**Variable:** `STRIPE_WEBHOOK_SECRET`
- **Type:** String
- **Required:** YES (for payment webhooks)
- **Description:** Secret for validating incoming Stripe webhooks
- **Where to get it:** https://dashboard.stripe.com/webhooks
- **Prefix:** `whsec_`
- **Used for:** Verifying webhook authenticity and integrity

---

## EMAIL NOTIFICATIONS - SENDGRID (OPTIONAL)

### 9. SendGrid API Key
**Variable:** `SENDGRID_API_KEY`
- **Type:** String
- **Required:** NO (leave empty to disable)
- **Description:** API key for SendGrid email service
- **Where to get it:** https://app.sendgrid.com/settings/api_keys
- **Prefix:** `SG.`
- **Impact:** Without this, email notifications will be silently skipped
- **Used for:** Sending order confirmations, shipment tracking, notifications

### 10. SendGrid From Email
**Variable:** `SENDGRID_FROM_EMAIL`
- **Type:** Email address
- **Required:** NO
- **Default:** `noreply@agriconnect.app`
- **Description:** Email address used as sender for automated emails
- **Note:** Must be verified in SendGrid account
- **Used for:** Setting the "From" field in notification emails

---

## WHATSAPP NOTIFICATIONS - META CLOUD API (OPTIONAL)

### 11. WhatsApp Token
**Variable:** `WHATSAPP_TOKEN`
- **Type:** String (Bearer token)
- **Required:** NO (leave empty to disable)
- **Description:** Meta WhatsApp Cloud API system user access token
- **Where to get it:** https://developers.facebook.com/docs/whatsapp/cloud-api/
- **Setup:** Configure a WhatsApp Business Account on Meta Platform
- **Impact:** Without this, WhatsApp notifications will be skipped
- **Used for:** Sending shipment tracking and order updates via WhatsApp

### 12. WhatsApp Phone Number ID
**Variable:** `WHATSAPP_PHONE_NUMBER_ID`
- **Type:** String (numeric ID)
- **Required:** NO (leave empty to disable)
- **Description:** The ID of the WhatsApp phone number to send from
- **Where to get it:** Meta Business Platform → WhatsApp Business Account settings
- **Requirements:** Must have a verified WhatsApp business phone number
- **Used for:** Routing outbound WhatsApp messages

---

## SHIPPING ADAPTERS (OPTIONAL)

### 13. DPD API Credentials
**Variables:** `DPD_API_USERNAME`, `DPD_API_PASSWORD`
- **Type:** String (username), String (password)
- **Required:** NO (leave empty for simulation mode)
- **Description:** DPD Local UK carrier integration credentials
- **Where to get it:** DPD UK business account dashboard
- **Impact:** Without these, shipments use local simulation mode
- **Used for:** Real-time shipment booking with DPD Local
- **Endpoint:** https://api.dpdlocal.co.uk/

### 14. Royal Mail API Key
**Variable:** `ROYAL_MAIL_API_KEY`
- **Type:** String (API key)
- **Required:** NO (leave empty for simulation mode)
- **Description:** Royal Mail Click & Drop / Shipping API key
- **Where to get it:** https://www.royalmail.com/shipping-api
- **Impact:** Without this, shipments use local simulation mode
- **Used for:** Real-time shipment booking with Royal Mail
- **Requirements:** Active Royal Mail business account

---

## AI INTEGRATION - OPENAI (OPTIONAL)

### 15. OpenAI API Key
**Variable:** `AI_INTEGRATIONS_OPENAI_API_KEY`
- **Type:** String
- **Required:** NO (leave empty to disable chat features)
- **Description:** OpenAI API key for ChatGPT/GPT-4 integration
- **Where to get it:** https://platform.openai.com/api-keys
- **Prefix:** `sk-`
- **Used for:** AI chat assistant in the platform
- **Rate limiting:** Requests are rate-limited per user to control costs
- **Cost:** Pay-as-you-go based on token usage

### 16. OpenAI Base URL (Optional Override)
**Variable:** `AI_INTEGRATIONS_OPENAI_BASE_URL`
- **Type:** String (URL)
- **Required:** NO
- **Default:** `https://api.openai.com/v1`
- **Description:** Custom base URL for OpenAI API (advanced)
- **Use cases:**
  - Using a proxy service
  - Using an alternative OpenAI-compatible provider
  - Custom enterprise endpoint
- **Example:** `https://api.custom-proxy.com/v1`

---

### 16b. Gemini API Key (Optional, Preferred for Voice AI)
**Variable:** `GEMINI_API_KEY`
- **Type:** String
- **Required:** NO
- **Description:** Google Gemini API key used by `/api/ai/voice` and AI translation when present
- **Where to get it:** Google AI Studio / Google Cloud Gemini API credentials
- **Fallback:** If missing or if Gemini fails, the app falls back to OpenAI when `AI_INTEGRATIONS_OPENAI_API_KEY` is configured

### 16c. Gemini Model (Optional)
**Variable:** `GEMINI_MODEL`
- **Type:** String
- **Required:** NO
- **Default:** `gemini-1.5-flash`
- **Description:** Gemini model name used by the backend REST integration

---

## REPLIT SPECIFIC (OPTIONAL)

### 17. Replit Domains
**Variable:** `REPLIT_DOMAINS`
- **Type:** Comma-separated string
- **Required:** NO
- **Description:** List of Replit domains for CORS and webhook validation
- **Format:** `domain1.replit.dev,domain2.replit.dev`
- **Used for:** Stripe webhook origin validation, CORS allowlist
- **Example:** `my-app.replit.dev,staging-app.replit.dev`

---

## ENVIRONMENT VARIABLE PRIORITY & DEFAULTS

| Variable | Required | Default | Auto-Detection |
|----------|----------|---------|-----------------|
| DATABASE_URL | YES | - | - |
| NODE_ENV | YES | development | Inferred from script |
| PORT | NO | 5000 | - |
| SESSION_SECRET | YES | - | - |
| REPL_ID | YES | - | Replit env |
| STRIPE_SECRET_KEY | YES | - | - |
| STRIPE_WEBHOOK_SECRET | YES | - | - |
| SENDGRID_API_KEY | NO | (empty) | - |
| SENDGRID_FROM_EMAIL | NO | noreply@agriconnect.app | - |
| WHATSAPP_TOKEN | NO | (empty) | - |
| WHATSAPP_PHONE_NUMBER_ID | NO | (empty) | - |
| DPD_API_USERNAME | NO | (empty) | - |
| DPD_API_PASSWORD | NO | (empty) | - |
| ROYAL_MAIL_API_KEY | NO | (empty) | - |
| AI_INTEGRATIONS_OPENAI_API_KEY | NO | (empty) | - |
| REPLIT_DOMAINS | NO | (empty) | - |

---

## SETUP INSTRUCTIONS BY DEPLOYMENT METHOD

### Local Development
```bash
# 1. Create .env file from template
cp .env.example .env

# 2. Set up local PostgreSQL
createdb agriconnect

# 3. Fill in required variables in .env
DATABASE_URL=postgresql://postgres:@localhost:5432/agriconnect
SESSION_SECRET=dev-secret-change-in-prod
REPL_ID=local-dev
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# 4. Run database migrations
npm run db:push

# 5. Start dev server
npm run dev
```

### Production on Replit
```bash
# 1. Set secrets in Replit Secrets panel
#    - DATABASE_URL (from Replit Postgres)
#    - SESSION_SECRET
#    - REPL_ID
#    - STRIPE_SECRET_KEY
#    - STRIPE_WEBHOOK_SECRET
#    - (and any optional ones you want to use)

# 2. Replit will load secrets as environment variables

# 3. Deploy
npm run build
npm run start
```

### Production on Railway/Render/Heroku
```bash
# 1. Create database (provided by platform)
# 2. Set environment variables in platform dashboard
# 3. Platform will provide DATABASE_URL automatically
# 4. Set remaining variables manually
# 5. Deploy
```

---

## SECURITY BEST PRACTICES

1. **Never commit .env to version control**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   *.env
   ```

2. **Use strong SESSION_SECRET for production**
   ```bash
   openssl rand -base64 32
   ```

3. **Rotate API keys regularly**
   - Stripe keys: Quarterly
   - SendGrid keys: Quarterly
   - OpenAI keys: When usage patterns change

4. **Use separate keys per environment**
   - Development: Test keys
   - Staging: Test keys with staging account
   - Production: Live keys (keep secured)

5. **Restrict API key permissions**
   - Stripe: Limit to necessary permissions
   - SendGrid: Use restricted API keys if available
   - OpenAI: Monitor usage and set spending limits

6. **Monitor for exposed secrets**
   - Check git history for accidental commits
   - Use tools like `git-secrets` or `detect-secrets`

---

## TROUBLESHOOTING

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify user permissions
- For remote databases: Check firewall/security groups

### Session Errors
- Verify SESSION_SECRET is set
- Ensure session table exists (auto-created by `connect-pg-simple`)
- Run migrations: `npm run db:push`

### Payment Processing Not Working
- Verify STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
- Check Stripe dashboard for API key restrictions
- Ensure webhook endpoint is publicly accessible

### Email Notifications Silent
- SENDGRID_API_KEY is optional; if missing, emails are skipped silently
- Set SENDGRID_API_KEY to enable
- Verify sender email is authorized in SendGrid

### AI Features Disabled
- AI_INTEGRATIONS_OPENAI_API_KEY is optional
- If not set, chat features will not be available
- Set API key and restart server to enable

---

## Related Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run check

# Database migrations
npm run db:push

# View database (requires drizzle-kit GUI)
npx drizzle-kit studio
```

---

**Last Updated:** December 2024
**Version:** 1.0
