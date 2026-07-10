export const COOKIE_CONSENT_STORAGE_KEY = "agriconnect_cookie_consent";
export const COOKIE_CONSENT_VERSION = "1.0";
export const COOKIE_SETTINGS_HASH = "#cookie-settings";

export type CookieConsentCategory = "essential" | "analytics" | "marketing" | "preferences";

export type CookieConsent = Record<CookieConsentCategory, boolean> & {
  version: string;
  timestamp: string;
};

export type OptionalCookiePreferences = Pick<
  CookieConsent,
  "analytics" | "marketing" | "preferences"
>;

export function readCookieConsent(): CookieConsent | null {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<CookieConsent>;
    if (typeof parsed.timestamp !== "string" || typeof parsed.version !== "string") return null;

    return {
      version: parsed.version,
      timestamp: parsed.timestamp,
      essential: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      preferences: parsed.preferences === true,
    };
  } catch {
    return null;
  }
}

export function saveCookieConsent(preferences: OptionalCookiePreferences): CookieConsent {
  const consent: CookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    essential: true,
    ...preferences,
  };

  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent("agriconnect:cookie-consent-updated", { detail: consent }));
  return consent;
}

export function hasCookieConsent(category: CookieConsentCategory): boolean {
  return category === "essential" || readCookieConsent()?.[category] === true;
}

export function openCookieSettings() {
  if (window.location.hash !== COOKIE_SETTINGS_HASH) {
    window.location.hash = COOKIE_SETTINGS_HASH;
  }

  window.dispatchEvent(new Event("agriconnect:open-cookie-settings"));
}

// Use this gate before initializing any future optional analytics or marketing integration.
export function runWithCookieConsent(category: Exclude<CookieConsentCategory, "essential">, callback: () => void) {
  if (hasCookieConsent(category)) callback();
}
