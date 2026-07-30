import { useState, useCallback, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { VirtualKeyboard } from "@/components/virtual-keyboard";
import { VoiceCommand } from "@/components/voice-command";
import { getReadablePageText, speakText } from "@/lib/accessibility";
import {
  COOKIE_CONSENT_VISIBILITY_EVENT,
  COOKIE_SETTINGS_HASH,
  readCookieConsent,
} from "@/lib/cookie-consent";

export function AccessibilityToolbar() {
  const [speaking, setSpeaking] = useState(false);
  const [cookieUiVisible, setCookieUiVisible] = useState(
    () =>
      readCookieConsent() === null ||
      window.location.hash === COOKIE_SETTINGS_HASH,
  );
  const [, setLocation] = useLocation();
  const { i18n, t } = useTranslation();
  const baseLang = i18n.language.split("-")[0];

  const readPage = useCallback(() => {
    if (!("speechSynthesis" in window)) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const text = getReadablePageText();
    if (!text) return;
    setSpeaking(true);
    const started = speakText(text, baseLang, () => setSpeaking(false));
    if (!started) setSpeaking(false);
  }, [baseLang, speaking]);

  const handleSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    setLocation(trimmed ? `/?search=${encodeURIComponent(trimmed)}` : "/");
  }, [setLocation]);

  useEffect(() => {
    const handleCookieVisibility = (event: Event) => {
      setCookieUiVisible(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener(
      COOKIE_CONSENT_VISIBILITY_EVENT,
      handleCookieVisibility,
    );
    return () =>
      window.removeEventListener(
        COOKIE_CONSENT_VISIBILITY_EVENT,
        handleCookieVisibility,
      );
  }, []);

  if (cookieUiVisible) return null;

  return (
    <div
      className="fixed bottom-[72px] right-3 z-[9998] flex items-center gap-0.5 rounded-lg border border-border/60 bg-background/95 p-0.5 shadow-lg shadow-black/10 backdrop-blur-xl [&>button]:h-7 [&>button]:w-7 md:bottom-2 md:right-4"
      data-testid="accessibility-toolbar"
      aria-label={t("accessibility.toolbar", "Accessibility tools")}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={readPage}
        className="h-7 w-7"
        title={speaking ? t("accessibility.stop_page", "Stop reading") : t("accessibility.read_page", "Read page")}
        aria-label={speaking ? t("accessibility.stop_page", "Stop reading") : t("accessibility.read_page", "Read page")}
        data-testid="button-read-page"
      >
        {speaking ? <VolumeX className="h-4 w-4 text-primary" /> : <Volume2 className="h-4 w-4" />}
      </Button>
      <VoiceCommand onSearch={handleSearch} />
      <VirtualKeyboard compact />
    </div>
  );
}
