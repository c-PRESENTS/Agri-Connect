import { useState, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { speakText } from "@/lib/accessibility";

interface TextToSpeechProps {
  text: string;
  className?: string;
  size?: "sm" | "default";
}

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

    setSpeaking(true);
    speakText(text, i18n.language.split("-")[0], () => setSpeaking(false));
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
