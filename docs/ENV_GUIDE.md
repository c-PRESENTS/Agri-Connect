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

### 5. Public App URL
**Variable:** `PUBLIC_APP_URL`
- **Type:** String (URL)
- **Required:** YES in production
- **Description:** Canonical public URL for redirects, payment callbacks, and generated links
- **Example:** `https://agriconnect.example.com`

### 6. Allowed App Origins
**Variable:** `APP_ORIGINS`
- **Type:** Comma-separated URLs
- **Required:** YES in production when multiple domains are used
- **Description:** Allowed frontend origins for payment redirects and origin validation
- **Example:** `https://agriconnect.example.com,https://www.agriconnect.example.com`
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

## OTP & SMS AUTHENTICATION

### 15. Vonage SMS (OTP Delivery)
**Variable:** `VONAGE_API_KEY`, `VONAGE_API_SECRET`, `VONAGE_FROM`
- **Type:** String
- **Required:** YES for production OTP delivery via SMS
- **Description:** Vonage credentials for sending OTP codes via SMS
- **Where to get it:** https://dashboard.vonage.com/
- **Impact:** Without these, OTP codes are logged to console in development. In production, OTP send fails unless another delivery channel is configured.
- **Used for:** Phone-based login via one-time passcode
- **Aliases supported:** `NEXMO_API_KEY`, `NEXMO_API_SECRET`, `VONAGE_FROM_NUMBER`, `VONAGE_SMS_FROM`, `VONAGE_BRAND_NAME`, `NEXMO_FROM`
- **Test helper:** Set `SMS_TEST_TO` and run `node --env-file=.env send-sms.js` to send a direct Vonage smoke-test SMS.

### 16. Google OAuth
**Variable:** `GOOGLE_CLIENT_ID`
- **Type:** String
- **Required:** YES for "Sign in with Google" button
- **Description:** Google OAuth client ID for identity verification
- **Where to get it:** https://console.cloud.google.com/apis/credentials
- **Format:** `123456789-xxxxx.apps.googleusercontent.com`
- **Used for:** Verifying Google ID tokens on the server

---

## AI INTEGRATION - OPENAI / GEMINI

### 15. OpenAI API Key
**Variable:** `AI_INTEGRATIONS_OPENAI_API_KEY`
- **Type:** String
- **Required:** YES for production AI chat, AI voice fallback, and AI translation fallback
- **Description:** OpenAI API key for ChatGPT/GPT-4 integration when Gemini is unavailable or not configured
- **Where to get it:** https://platform.openai.com/api-keys
- **Prefix:** `sk-`
- **Used for:** AI chat assistant, secondary AI voice interpretation, and secondary real-time translation
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

### 16b. Gemini API Key (Preferred for Voice AI and Translation)
**Variable:** `GEMINI_API_KEY`
- **Type:** String
- **Required:** YES for production Gemini AI voice assistant, real-time translation, and auto-translation
- **Description:** Google Gemini API key used by `/api/ai/voice` and `/api/ai/translate`
- **Where to get it:** Google AI Studio / Google Cloud Gemini API credentials
- **Provider behavior:** Gemini is preferred. If Gemini is missing or unavailable, the backend uses OpenAI only when `AI_INTEGRATIONS_OPENAI_API_KEY` is configured. If neither provider is configured, AI voice and AI translation return a service-unavailable response instead of local fallback text.

### 16c. Gemini Model (Optional)
**Variable:** `GEMINI_MODEL`
- **Type:** String
- **Required:** NO
- **Default:** `gemini-1.5-flash`
- **Description:** Gemini model name used by the backend REST integration

---

## HOSTING SPECIFIC (OPTIONAL)

### 17. Alternate App Origins
**Variable:** `APP_ORIGINS`
- **Type:** Comma-separated URLs
- **Required:** NO when `PUBLIC_APP_URL` is enough
- **Description:** Additional deployment domains for preview or multi-domain hosting
- **Format:** `https://domain1.example.com,https://domain2.example.com`
- **Used for:** Stripe redirect origin validation

---

## ENVIRONMENT VARIABLE PRIORITY & DEFAULTS

| Variable | Required | Default | Auto-Detection |
|----------|----------|---------|-----------------|
| DATABASE_URL | YES | - | - |
| NODE_ENV | YES | development | Inferred from script |
| PORT | NO | 5000 | - |
| SESSION_SECRET | YES | - | - |
| PUBLIC_APP_URL | YES in production | - | Hosting provider |
| STRIPE_SECRET_KEY | YES | - | - |
| STRIPE_WEBHOOK_SECRET | YES | - | - |
| SENDGRID_API_KEY | NO | (empty) | - |
| SENDGRID_FROM_EMAIL | NO | noreply@agriconnect.app | - |
| VONAGE_API_KEY | YES for production OTP SMS | (empty) | - |
| VONAGE_API_SECRET | YES for production OTP SMS | (empty) | - |
| VONAGE_FROM | YES for production OTP SMS | (empty) | - |
| WHATSAPP_TOKEN | NO | (empty) | - |
| WHATSAPP_PHONE_NUMBER_ID | NO | (empty) | - |
| DPD_API_USERNAME | NO | (empty) | - |
| DPD_API_PASSWORD | NO | (empty) | - |
| ROYAL_MAIL_API_KEY | NO | (empty) | - |
| AI_INTEGRATIONS_OPENAI_API_KEY | YES for production AI | (empty) | - |
| GEMINI_API_KEY | YES for production AI voice/translation | (empty) | - |
| APP_ORIGINS | NO | (empty) | Hosting provider |

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
PUBLIC_APP_URL=http://localhost:5000
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# 4. Run database migrations
npm run db:push

# 5. Start dev server
npm run dev
```

### Production
```bash
# 1. Set environment variables in your hosting provider
#    - DATABASE_URL
#    - SESSION_SECRET
#    - PUBLIC_APP_URL
#    - STRIPE_SECRET_KEY
#    - STRIPE_WEBHOOK_SECRET
#    - (and any optional ones you want to use)

# 2. Your host will load secrets as environment variables

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
- `GEMINI_API_KEY` and `AI_INTEGRATIONS_OPENAI_API_KEY` control production AI features.
- If neither key is set, `/api/ai/voice` and `/api/ai/translate` return service-unavailable responses.
- Browser-only features such as regional input, text-to-speech, and predefined voice navigation do not require AI keys.
- Set the provider key(s) and restart the server to enable production AI voice and translation.

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
