import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";

declare global {
  interface Window {
    turnstile?: {
      render(
        element: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          theme?: "auto" | "light" | "dark";
          callback(token: string): void;
          "expired-callback"(): void;
          "error-callback"(): void;
        },
      ): string;
      remove(widgetId: string): void;
      reset(widgetId: string): void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | undefined;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-agriconnect-turnstile="true"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile failed to load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.agriconnectTurnstile = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(script);
  });
  return turnstileScriptPromise;
}

export function TurnstileWidget({
  siteKey,
  resetKey,
  onTokenChange,
}: {
  siteKey: string;
  resetKey: number;
  onTokenChange(token: string): void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    onTokenChange("");

    void loadTurnstileScript()
      .then(() => {
        if (!active || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action: "checkout",
          theme: "auto",
          callback: (token) => {
            onTokenChange(token);
            setStatus("ready");
          },
          "expired-callback": () => {
            onTokenChange("");
            setStatus("loading");
          },
          "error-callback": () => {
            onTokenChange("");
            setStatus("error");
          },
        });
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = undefined;
      }
    };
  }, [onTokenChange, resetKey, siteKey]);

  return (
    <div className="rounded-2xl border-2 border-border/70 bg-muted/20 p-4" data-testid="checkout-turnstile">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-green-600" />
        <span className="font-black text-foreground">Security verification</span>
      </div>
      <div ref={containerRef} className="min-h-[65px]" />
      {status === "loading" && (
        <p className="mt-2 flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing secure checkout…
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 flex items-center gap-2 text-xs font-bold text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> Verification could not load. Check your connection and retry.
        </p>
      )}
    </div>
  );
}

