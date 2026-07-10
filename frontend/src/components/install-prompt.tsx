import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const INSTALL_PROMPT_DISMISSED_KEY = "agriconnect-install-prompt-dismissed-v1";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export function InstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      if (localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY)) return;

      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "dismissed");
    setDeferredPrompt(null);
  };

  const install = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    setDeferredPrompt(null);
  };

  if (!deferredPrompt) return null;

  return (
    <section
      className="fixed bottom-24 left-3 z-50 max-w-sm rounded-lg border bg-background p-4 shadow-lg md:bottom-5"
      aria-label={t("install_prompt.aria_label")}
      role="region"
    >
      <div className="flex gap-3">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">{t("install_prompt.title")}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("install_prompt.description")}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={dismiss}>{t("install_prompt.dismiss")}</Button>
        <Button size="sm" onClick={install}>{t("install_prompt.install")}</Button>
      </div>
    </section>
  );
}
