import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  type OptionalCookiePreferences,
  COOKIE_SETTINGS_HASH,
  readCookieConsent,
  saveCookieConsent,
} from "@/lib/cookie-consent";

type ConsentView = "banner" | "preferences" | null;

const ACCEPT_ALL: OptionalCookiePreferences = {
  analytics: true,
  marketing: true,
  preferences: true,
};

const REJECT_NON_ESSENTIAL: OptionalCookiePreferences = {
  analytics: false,
  marketing: false,
  preferences: false,
};

export function CookieConsentBanner() {
  const { t } = useTranslation();
  const [view, setView] = useState<ConsentView>(null);
  const [preferences, setPreferences] = useState<OptionalCookiePreferences>(REJECT_NON_ESSENTIAL);

  useEffect(() => {
    const storedConsent = readCookieConsent();
    if (!storedConsent) setView("banner");
    if (storedConsent) {
      setPreferences({
        analytics: storedConsent.analytics,
        marketing: storedConsent.marketing,
        preferences: storedConsent.preferences,
      });
    }

    const openSettings = () => {
      const currentConsent = readCookieConsent();
      if (currentConsent) {
        setPreferences({
          analytics: currentConsent.analytics,
          marketing: currentConsent.marketing,
          preferences: currentConsent.preferences,
        });
      }
      setView("preferences");
    };

    const openSettingsFromHash = () => {
      if (window.location.hash === COOKIE_SETTINGS_HASH) openSettings();
    };

    openSettingsFromHash();
    window.addEventListener("agriconnect:open-cookie-settings", openSettings);
    window.addEventListener("hashchange", openSettingsFromHash);
    return () => {
      window.removeEventListener("agriconnect:open-cookie-settings", openSettings);
      window.removeEventListener("hashchange", openSettingsFromHash);
    };
  }, []);

  const clearCookieSettingsHash = () => {
    if (window.location.hash === COOKIE_SETTINGS_HASH) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  };

  const save = (selection: OptionalCookiePreferences) => {
    saveCookieConsent(selection);
    setPreferences(selection);
    clearCookieSettingsHash();
    setView(null);
  };

  const closePreferences = () => {
    clearCookieSettingsHash();
    setView(readCookieConsent() ? null : "banner");
  };

  const togglePreference = (category: keyof OptionalCookiePreferences) => {
    setPreferences((current) => ({ ...current, [category]: !current[category] }));
  };

  if (!view) return null;

  if (view === "preferences") {
    const categories: Array<{
      key: keyof OptionalCookiePreferences | "essential";
      locked?: boolean;
      title: string;
      description: string;
    }> = [
      { key: "essential", locked: true, title: t("cookie_consent.categories.essential.title"), description: t("cookie_consent.categories.essential.description") },
      { key: "preferences", title: t("cookie_consent.categories.preferences.title"), description: t("cookie_consent.categories.preferences.description") },
      { key: "analytics", title: t("cookie_consent.categories.analytics.title"), description: t("cookie_consent.categories.analytics.description") },
      { key: "marketing", title: t("cookie_consent.categories.marketing.title"), description: t("cookie_consent.categories.marketing.description") },
    ];

    return (
      <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/40 p-3 sm:items-center" role="presentation">
        <section
          className="w-full max-w-xl rounded-lg border bg-background p-5 shadow-xl"
          aria-label={t("cookie_consent.preferences_aria_label")}
          aria-modal="true"
          role="dialog"
        >
          <h2 className="text-base font-semibold">{t("cookie_consent.preferences_title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("cookie_consent.preferences_description")}</p>
          <div className="mt-4 divide-y rounded-md border">
            {categories.map((category) => {
              const checked = category.key === "essential" ? true : preferences[category.key];
              return (
                <label key={category.key} className="flex cursor-pointer items-start gap-3 p-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-primary"
                    checked={checked}
                    disabled={category.locked}
                    onChange={() => category.key !== "essential" && togglePreference(category.key)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{category.title}</span>
                    <span className="block text-xs leading-5 text-muted-foreground">{category.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={closePreferences}>
              {t("cookie_consent.back")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => save(REJECT_NON_ESSENTIAL)}>
              {t("cookie_consent.reject_non_essential")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => save(ACCEPT_ALL)}>
              {t("cookie_consent.accept_all")}
            </Button>
            <Button size="sm" onClick={() => save(preferences)}>{t("cookie_consent.save_preferences")}</Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <section
      className="fixed inset-x-3 bottom-3 z-[10000] mx-auto max-w-2xl rounded-lg border bg-background p-4 shadow-lg sm:inset-x-auto sm:right-5"
      aria-label={t("cookie_consent.aria_label")}
      role="region"
    >
      <p className="text-sm font-medium">{t("cookie_consent.title")}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {t("cookie_consent.description")} {" "}
        <Link href="/privacy-policy" className="text-primary underline underline-offset-2">
          {t("cookie_consent.learn_more")}
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setView("preferences")}>
          {t("cookie_consent.manage_preferences")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => save(REJECT_NON_ESSENTIAL)}>
          {t("cookie_consent.reject_non_essential")}
        </Button>
        <Button size="sm" onClick={() => save(ACCEPT_ALL)}>
          {t("cookie_consent.accept_all")}
        </Button>
      </div>
    </section>
  );
}
