# Login & Authentication Overhaul

## What & Why
AgriConnect currently has no real authentication flow — the app uses hardcoded user IDs and has no login or registration UI. This task wires up a complete, modern authentication system covering all AB requirements: a redesigned login/register page, working session-based auth via Passport.js, social login (Google), two-factor authentication (TOTP), WebAuthn biometric/passkey login, passwordless magic-link login, and a post-login profile completion wizard. This is the foundational task that gates all personalized features across the platform.

## Done looks like
- A polished, full-page login/register UI at `/login` replaces the old placeholder, with smooth tab switching between Sign In and Sign Up
- Users can register with email+password and log in; sessions persist correctly; hardcoded IDs are replaced with real session user
- Google OAuth social login button works and creates/links an account on first use
- After login, users with incomplete profiles are guided through a step-by-step profile completion wizard (role, name, location, avatar)
- 2FA (TOTP) can be enabled from profile settings; a QR code is shown for authenticator apps (Google Authenticator, Authy); login prompts for the 6-digit code when enabled
- Passwordless login: users can request a magic link sent to their registered email; clicking it logs them in without a password
- Biometric/passkey login (WebAuthn) can be registered and used for fast, secure login on supported devices/browsers
- SSO is handled via the OAuth/social login framework (Google as primary provider); the architecture supports adding more providers (GitHub, Microsoft, Apple) by adding passport strategies
- The TopNavigation "User" button shows login state — if not logged in, it links to `/login`; if logged in, it shows the user's avatar/name with a dropdown for profile and logout
- All auth routes are protected: visiting `/dashboard` or other protected pages while logged out redirects to `/login`

## Out of scope
- Enterprise SAML-based SSO (institutional/corporate identity providers)
- SMS/phone OTP for passwordless (email magic link only)
- Social login providers beyond Google (architecture supports adding more later)
- Email delivery infrastructure — magic links are logged to the console in dev; a placeholder email service interface is created for future wiring
- Password reset / "forgot password" email flow (separate task)

## Tasks

1. **Wire up Passport.js and session middleware** — Configure `express-session` and `passport-local` in `server/index.ts`; add `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me` endpoints in `server/routes.ts`; extend the users schema to include `twoFactorSecret`, `twoFactorEnabled`, `passwordlessToken`, and `webauthnCredentials` fields; update `IStorage` and `MemStorage` with the needed user methods.

2. **Google OAuth social login** — Add `passport-google-oauth20` strategy; create `GET /api/auth/google` and `GET /api/auth/google/callback` routes; store OAuth profile linked to existing account by email or create a new one on first use.

3. **Two-Factor Authentication (TOTP)** — Add `speakeasy` and `qrcode` packages; create endpoints to enable 2FA (generate secret, return QR code), verify setup, and disable; modify the login flow to require the TOTP code when 2FA is enabled; add a 2FA settings section in the profile page.

4. **Passwordless magic-link login** — Add endpoints to request a magic link (`POST /api/auth/magic-link`) and consume it (`GET /api/auth/magic-link/verify?token=...`); generate a signed token stored on the user record with a 15-minute expiry; log the link to the console in dev (placeholder for email service).

5. **WebAuthn biometric/passkey login** — Add `@simplewebauthn/server` and `@simplewebauthn/browser` packages; implement registration and authentication ceremony endpoints; store credential public key and counter on the user record; add a "Register passkey" option in profile settings.

6. **Redesigned Login/Register page** — Build `/login` as a visually rich full-page component with AgriConnect branding, animated background (subtle farm imagery/gradient), tabbed Sign In / Sign Up forms using shadcn Form + react-hook-form + zod, Google login button, magic link request option, passkey login button, and a "remember me" checkbox; redirect to `/` (or the originally intended destination) after successful auth.

7. **Profile completion wizard** — After first login or registration, if the user's profile is incomplete (missing role, location, or name), show a multi-step modal wizard: step 1 — choose role (farmer/buyer); step 2 — enter name and phone; step 3 — pick location (text input with map pin); step 4 — upload avatar. Wizard state is tracked via a `profileComplete` boolean on the user record.

8. **Auth-aware navigation and route guards** — Update `TopNavigation` to reflect login state (avatar + name dropdown vs. login button); add a `useAuth` hook and a `ProtectedRoute` wrapper component; wrap `/dashboard` and all sub-routes with `ProtectedRoute` so unauthenticated users are redirected to `/login`; replace all hardcoded `"farmer-1"` and `"guest"` IDs in routes with the real session user ID.

## Relevant files
- `client/src/App.tsx`
- `client/src/components/top-navigation.tsx`
- `server/index.ts`
- `server/routes.ts`
- `server/storage.ts`
- `shared/schema.ts`
