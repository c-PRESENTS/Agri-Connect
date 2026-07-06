import { useState } from "react";
import { Languages, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

interface TranslateButtonProps {
  text: string;
  onTranslated?: (translated: string) => void;
  className?: string;
}

export function TranslateButton({ text, onTranslated, className = "" }: TranslateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const { i18n, t } = useTranslation();
  const { toast } = useToast();

  const baseLang = i18n.language.split("-")[0];
  if (baseLang === "en") return null;

  const translate = async () => {
    if (translated) {
      setTranslated(null);
      onTranslated?.(text);
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/ai/translate", {
        text,
        targetLanguage: baseLang,
        context: "agricultural marketplace product description",
      });
      const data = await res.json();
      setTranslated(data.translated);
      onTranslated?.(data.translated);
    } catch {
      toast({
        title: t("common.error"),
        description: t("auto_translate.unavailable"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={translate}
        disabled={loading}
        className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-primary transition-colors px-1.5"
        data-testid="button-translate"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : translated ? (
          <RotateCcw className="h-3 w-3" />
        ) : (
          <Languages className="h-3 w-3" />
        )}
        {translated ? t("product.original") : t("product.translate")}
      </Button>
    </div>
  );
}
