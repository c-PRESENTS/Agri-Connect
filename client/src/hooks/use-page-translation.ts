import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";

const A_TR = "data-agri-tr";
const A_OR = "data-agri-or";
const SKIP = `[${A_TR}],script,style,noscript,svg,code,pre,input,textarea,select,option,.lucide,[hidden],[aria-hidden="true"],[data-no-tr]`;
const MIN_LEN = 2;
const CONCURRENCY = 3;

type TextEntry = { text: string; node: Text };

function scanTextNodes(): TextEntry[] {
  const out: TextEntry[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = (n as Text).parentElement;
      if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
      const t = (n as Text).textContent?.trim() || "";
      if (t.length < MIN_LEN) return NodeFilter.FILTER_REJECT;
      if (/^[\d\s\-.,;:!?()%$€£+×÷=<>@#&*\\/]+$/.test(t))
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Text | null;
  while ((n = walker.nextNode() as Text | null)) {
    out.push({ text: n.textContent!.trim(), node: n });
  }
  return out;
}

function wrapWithTranslation(node: Text, original: string, translated: string) {
  const span = document.createElement("span");
  span.textContent = translated;
  span.setAttribute(A_OR, original);
  span.setAttribute(A_TR, "true");
  span.style.all = "inherit";
  node.parentNode?.replaceChild(span, node);
}

function restoreAll() {
  document.querySelectorAll<HTMLElement>(`[${A_TR}]`).forEach((el) => {
    const orig = el.getAttribute(A_OR);
    if (orig !== null) el.textContent = orig;
    el.removeAttribute(A_TR);
    el.removeAttribute(A_OR);
  });
}

function cacheKey(text: string, lang: string) {
  return `${lang}:${text}`;
}

export function usePageTranslation() {
  const { i18n } = useTranslation();
  const cacheRef = useRef<Map<string, string>>(new Map());
  const enabledRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);

  const translate = useCallback(async () => {
    const lang = i18n.language.split("-")[0];
    if (lang === "en") return;

    const entries = scanTextNodes();
    if (entries.length === 0) return;

    const uniqueTexts = Array.from(new Set(entries.map((e) => e.text)));
    const toFetch = uniqueTexts.filter(
      (t) => !cacheRef.current.has(cacheKey(t, lang)),
    );

    if (toFetch.length > 0) {
      const results = new Map<string, string>();
      for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
        const batch = toFetch.slice(i, i + CONCURRENCY);
        const res = await Promise.allSettled(
          batch.map((text) =>
            apiRequest("POST", "/api/ai/translate", {
              text,
              targetLanguage: lang,
              context: "agricultural marketplace content",
            }).then((r) => r.json() as Promise<{ translated: string }>),
          ),
        );
        res.forEach((r, idx) => {
          if (r.status === "fulfilled") {
            results.set(batch[idx], r.value.translated);
          }
        });
      }
      results.forEach((translated, original) => {
        cacheRef.current.set(cacheKey(original, lang), translated);
      });
    }

    for (const entry of entries) {
      const cached = cacheRef.current.get(cacheKey(entry.text, lang));
      if (cached) {
        wrapWithTranslation(entry.node, entry.text, cached);
      }
    }
  }, [i18n.language]);

  const handleEnable = useCallback(() => {
    translate();
    observerRef.current = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList" && m.addedNodes.length > 0) {
          translate();
          break;
        }
      }
    });
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }, [translate]);

  const handleDisable = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    restoreAll();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      enabledRef.current = detail;
      if (detail) {
        handleEnable();
      } else {
        handleDisable();
      }
    };
    window.addEventListener("auto-translate-changed", handler);

    const stored = localStorage.getItem("agriconnect-auto-translate") === "true";
    if (stored && i18n.language !== "en") {
      enabledRef.current = true;
      handleEnable();
    }

    return () => {
      window.removeEventListener("auto-translate-changed", handler);
      observerRef.current?.disconnect();
      if (enabledRef.current) {
        restoreAll();
      }
    };
  }, [i18n.language, handleEnable, handleDisable]);
}
