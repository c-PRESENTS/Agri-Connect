# Multi-Language & Voice System

## What & Why
Complete the multi-language system and voice accessibility features so the platform is genuinely usable by farmers who speak different languages and may have low literacy. The i18n structure exists (EN, HI, PA, CY, PL) but translation strings only cover a small fraction of the UI. Voice navigation, text-to-speech, and AI-powered voice assistant are partially built but not unified or complete.

## Done looks like
- Every user-facing string across all pages (Home, Dashboard, Cart, Farmers Help, Land Leasing, Logistics, Share & Care, Settings, Login) uses the i18n translation system — switching language updates the whole UI
- Language switcher is prominent and accessible, supporting EN, HI (Hindi), PA (Punjabi), CY (Welsh), PL (Polish); adding at minimum one African/South Asian language (e.g. TA Tamil or SW Swahili) for global reach
- AI Voice Assistant (using the existing OpenAI integration) accepts spoken queries in the active language, understands agricultural context, and responds with both text and spoken audio in the correct language
- Text-to-Speech button ("Listen") available on product cards, product detail, and Farmers Help articles — reads content aloud in the selected language
- Voice navigation commands work across all main navigation routes in every supported language (not just English patterns)
- A language keyboard hint/guide appears when a non-Latin script is selected (Hindi, Punjabi), guiding users to switch their device keyboard
- Auto-translate toggle: when enabled, product names and descriptions not in the selected language get translated on-the-fly via the OpenAI API (cached per session to avoid excessive calls)

## Out of scope
- Native mobile apps or OS-level keyboard installation
- Paid third-party translation APIs beyond what OpenAI can provide
- Right-to-left (RTL) layout support (Arabic/Urdu) — future work
- Professional human translation review

## Tasks
1. **Complete translation files** — Expand all locale JSON files (en, hi, pa, cy, pl) to cover every UI string across all pages and components. Add a Tamil (ta) or Swahili (sw) locale file as a sixth language option.

2. **Wire translations across all pages** — Replace every hardcoded English string in all page and component files with `t('key')` calls referencing the translation keys, ensuring switching language updates the full UI.

3. **Unified Voice Assistant upgrade** — Extend the existing VoiceCommand component to send queries to the OpenAI AI endpoint with language context, return responses in the active language, and expand nav command patterns for all supported languages. Ensure spoken responses use the correct BCP-47 voice.

4. **Text-to-Speech integration** — Wire the existing TextToSpeech component to product cards, Farmers Help content sections, and any dynamic text areas so the "Listen" button reads content aloud in the user's chosen language.

5. **Auto-translation for product content** — Add a toggle in the top navigation or settings. When on, product names and descriptions that aren't in the selected language are translated via the `/api/ai` endpoint and cached in React Query so repeated renders don't re-fetch.

6. **Language keyboard guidance** — When the user switches to a non-Latin script language (Hindi, Punjabi, Tamil), show a small dismissible banner explaining how to enable that script's keyboard on their device, with platform-specific tips.

## Relevant files
- `client/src/i18n/index.ts`
- `client/src/i18n/locales/en.json`
- `client/src/i18n/locales/hi.json`
- `client/src/i18n/locales/pa.json`
- `client/src/i18n/locales/cy.json`
- `client/src/i18n/locales/pl.json`
- `client/src/components/language-switcher.tsx`
- `client/src/components/voice-command.tsx`
- `client/src/components/text-to-speech.tsx`
- `client/src/components/top-navigation.tsx`
- `client/src/pages/home.tsx`
- `client/src/pages/dashboard.tsx`
- `client/src/pages/farmers-help.tsx`
- `client/src/pages/land-leasing.tsx`
- `client/src/pages/logistics.tsx`
- `client/src/pages/cart.tsx`
- `client/src/pages/login.tsx`
- `server/routes.ts`
