import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import { usePageTranslation } from "@/hooks/use-page-translation";
import { SeoManager } from "@/components/seo-manager";
import { AppRoutes } from "@/app/routes";
import { AppShell } from "@/app/shell";

const AIChatAssistant = lazy(() => import("@/components/ai-chat-assistant").then((module) => ({ default: module.AIChatAssistant })));
const ProfileWizard = lazy(() => import("@/components/profile-wizard").then((module) => ({ default: module.ProfileWizard })));
const CompareBar = lazy(() => import("@/components/compare-bar").then((module) => ({ default: module.CompareBar })));
const AccessibilityToolbar = lazy(() => import("@/components/accessibility-toolbar").then((module) => ({ default: module.AccessibilityToolbar })));
const CookieConsentBanner = lazy(() => import("@/components/cookie-consent-banner").then((module) => ({ default: module.CookieConsentBanner })));
const InstallPrompt = lazy(() => import("@/components/install-prompt").then((module) => ({ default: module.InstallPrompt })));

const RTL_LANGS = new Set(["ar", "ur", "fa", "he"]);

function RouteFallback() {
  return <div className="min-h-screen bg-background" aria-busy="true" />;
}

function ShellFallback() {
  return null;
}

function I18nRuntime() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "en";
  const baseLang = lang.split("-")[0];

  useEffect(() => {
    document.documentElement.lang = baseLang;
    document.documentElement.dir = RTL_LANGS.has(baseLang) ? "rtl" : "ltr";
    localStorage.setItem("agriconnect-lang", baseLang);
  }, [baseLang]);

  return null;
}

function GlobalOverlays() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <CompareBar />
      <AccessibilityToolbar />
      <AIChatAssistant />
      <CookieConsentBanner />
      <InstallPrompt />
    </Suspense>
  );
}

export function AppContent() {
  const { user, isAuthenticated } = useAuth();
  usePageTranslation();

  return (
    <>
      <I18nRuntime />
      <Toaster />
      <SeoManager />
      {isAuthenticated && user && !user.profileComplete && (
        <Suspense fallback={<ShellFallback />}>
          <ProfileWizard />
        </Suspense>
      )}
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <AppRoutes />
        </Suspense>
      </AppShell>
      <GlobalOverlays />
    </>
  );
}
