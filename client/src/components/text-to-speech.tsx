import { useState, useCallback } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface TextToSpeechProps {
  text: string;
  className?: string;
  size?: "sm" | "default";
}

const LANG_CODES: Record<string, string> = {
  en: "en-GB",
  hi: "hi-IN",
  pa: "pa-IN",
  cy: "cy-GB",
  pl: "pl-PL",
  ta: "ta-IN",
};

export function TextToSpeech({ text, className = "", size = "sm" }: TextToSpeechProps) {
  const [speaking, setSpeaking] = useState(false);
  const { i18n, t } = useTranslation();

  const speak = useCallback(() => {
    if (!("speechSynthesis" in window)) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const baseLang = i18n.language.split("-")[0];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_CODES[baseLang] || "en-GB";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.startsWith(utterance.lang.split("-")[0]));
    if (match) utterance.voice = match;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [text, speaking, i18n.language]);

  if (!("speechSynthesis" in window)) return null;

  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "sm" : "default"}
      onClick={speak}
      className={`gap-1 text-[10px] font-bold uppercase tracking-tight text-muted-foreground hover:text-primary transition-colors ${className}`}
      title={speaking ? t("product.stop") : t("product.listen")}
      data-testid="button-tts"
    >
      {speaking ? (
        <VolumeX className="h-3.5 w-3.5 text-primary animate-pulse" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
      {size !== "sm" && <span>{speaking ? t("product.stop") : t("product.listen")}</span>}
    </Button>
  );
}
