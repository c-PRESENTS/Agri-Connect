import { useState } from "react";
import { Globe, Check, X, Keyboard, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", native: "English", script: null },
  { code: "hi", label: "Hindi", flag: "🇮🇳", native: "हिन्दी", script: "Devanagari" },
  { code: "pa", label: "Punjabi", flag: "🇮🇳", native: "ਪੰਜਾਬੀ", script: "Gurmukhi" },
  { code: "ta", label: "Tamil", flag: "🇮🇳", native: "தமிழ்", script: "Tamil" },
  { code: "cy", label: "Welsh", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", native: "Cymraeg", script: null },
  { code: "pl", label: "Polish", flag: "🇵🇱", native: "Polski", script: null },
];

export function useAutoTranslate() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem("agriconnect-auto-translate") === "true");
  const toggle = (val: boolean) => {
    setEnabled(val);
    localStorage.setItem("agriconnect-auto-translate", String(val));
    window.dispatchEvent(new CustomEvent("auto-translate-changed", { detail: val }));
  };
  return { autoTranslate: enabled, setAutoTranslate: toggle };
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [showKeyboardHint, setShowKeyboardHint] = useState(false);
  const { autoTranslate, setAutoTranslate } = useAutoTranslate();
  const baseLang = i18n.language.split("-")[0];
  const current = LANGUAGES.find((l) => l.code === baseLang) || LANGUAGES[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("agriconnect-lang", code);
    const lang = LANGUAGES.find((l) => l.code === code);
    if (lang?.script) {
      const dismissed = localStorage.getItem(`keyboard-hint-${code}`);
      if (!dismissed) {
        setShowKeyboardHint(true);
      }
    } else {
      setShowKeyboardHint(false);
    }
  };

  const dismissKeyboardHint = () => {
    setShowKeyboardHint(false);
    localStorage.setItem(`keyboard-hint-${i18n.language}`, "dismissed");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/5 transition-colors relative"
            data-testid="button-language-switcher"
            title="Change language"
          >
            <Globe className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 text-[8px] leading-none">{current.flag}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 backdrop-blur-xl" data-testid="dropdown-language">
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className="flex items-center gap-2 cursor-pointer"
              data-testid={`lang-option-${lang.code}`}
            >
              <span className="text-base">{lang.flag}</span>
              <div className="flex-1">
                <div className="text-[12px] font-semibold">{lang.native}</div>
                <div className="text-[10px] text-muted-foreground">{lang.label}</div>
              </div>
              {lang.script && (
                <Keyboard className="h-3 w-3 text-muted-foreground" />
              )}
              {baseLang === lang.code && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          {baseLang !== "en" && (
            <>
              <DropdownMenuSeparator />
              <div
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
                onClick={(e) => { e.preventDefault(); setAutoTranslate(!autoTranslate); }}
                data-testid="toggle-auto-translate"
              >
                <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] flex-1">{t("auto_translate.toggle_label")}</span>
                <Switch
                  checked={autoTranslate}
                  onCheckedChange={setAutoTranslate}
                  className="scale-75"
                  data-testid="switch-auto-translate"
                />
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AnimatePresence>
        {showKeyboardHint && current.script && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] w-[90vw] max-w-md"
            data-testid="banner-keyboard-hint"
          >
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg shadow-lg p-4">
              <div className="flex items-start gap-3">
                <Keyboard className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    {t("keyboard.title")}
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {t("keyboard.description", { language: current.native, script: current.script })}
                  </p>
                  <div className="mt-2 space-y-1 text-[10px] text-amber-600 dark:text-amber-400">
                    <p>{t("keyboard.ios_tip")}</p>
                    <p>{t("keyboard.android_tip")}</p>
                    <p>{t("keyboard.windows_tip")}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissKeyboardHint}
                  className="h-6 px-2 text-[10px] text-amber-600 hover:text-amber-800 hover:bg-amber-100"
                  data-testid="button-dismiss-keyboard-hint"
                >
                  {t("keyboard.dismiss")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
