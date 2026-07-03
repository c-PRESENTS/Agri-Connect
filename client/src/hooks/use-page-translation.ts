import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";

const A_TR = "data-agri-tr";
const A_OR = "data-agri-or";
const A_ATTR_TR = "data-agri-attr-tr";
const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP = `[${A_TR}],script,style,noscript,svg,code,pre,input,textarea,select,option,.lucide,[hidden],[aria-hidden="true"],[data-no-tr]`;
const MIN_LEN = 2;
const CONCURRENCY = 3;

type TextEntry = { text: string; node: Text };
type AttrEntry = { text: string; el: HTMLElement; attr: typeof ATTRS[number] };

function isTranslatableText(text: string) {
  const t = text.trim();
  if (t.length < MIN_LEN) return false;
  return !/^[\d\s\-.,;:!?()%$€£+×÷=<>@#&*\\/]+$/.test(t);
}

function scanTextNodes(): TextEntry[] {
  const out: TextEntry[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = (n as Text).parentElement;
      if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
      const t = (n as Text).textContent?.trim() || "";
      if (!isTranslatableText(t)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Text | null;
  while ((n = walker.nextNode() as Text | null)) {
    out.push({ text: n.textContent!.trim(), node: n });
  }
  return out;
}

function scanAttributeNodes(): AttrEntry[] {
  const out: AttrEntry[] = [];
  document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
    if (el.closest(SKIP) || el.hasAttribute("data-no-tr")) return;
    for (const attr of ATTRS) {
      const text = el.getAttribute(attr);
      if (text && isTranslatableText(text)) {
        out.push({ text: text.trim(), el, attr });
      }
    }
  });
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

function setTranslatedAttribute(el: HTMLElement, attr: typeof ATTRS[number], original: string, translated: string) {
  const originalAttr = `data-agri-or-${attr}`;
  if (!el.hasAttribute(originalAttr)) {
    el.setAttribute(originalAttr, original);
  }
  el.setAttribute(attr, translated);
  el.setAttribute(A_ATTR_TR, "true");
}

function restoreAll() {
  document.querySelectorAll<HTMLElement>(`[${A_TR}]`).forEach((el) => {
    const orig = el.getAttribute(A_OR);
    if (orig !== null) el.textContent = orig;
    el.removeAttribute(A_TR);
    el.removeAttribute(A_OR);
  });
  document.querySelectorAll<HTMLElement>(`[${A_ATTR_TR}]`).forEach((el) => {
    for (const attr of ATTRS) {
      const originalAttr = `data-agri-or-${attr}`;
      const orig = el.getAttribute(originalAttr);
      if (orig !== null) {
        el.setAttribute(attr, orig);
        el.removeAttribute(originalAttr);
      }
    }
    el.removeAttribute(A_ATTR_TR);
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
    const attrEntries = scanAttributeNodes();
    if (entries.length === 0 && attrEntries.length === 0) return;

    const uniqueTexts = Array.from(new Set([...entries.map((e) => e.text), ...attrEntries.map((e) => e.text)]));
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
    for (const entry of attrEntries) {
      const cached = cacheRef.current.get(cacheKey(entry.text, lang));
      if (cached) {
        setTranslatedAttribute(entry.el, entry.attr, entry.text, cached);
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
      attributes: true,
      attributeFilter: [...ATTRS],
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
