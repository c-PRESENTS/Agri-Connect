import { useEffect, useRef, useCallback, type MutableRefObject } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const A_TR = "data-agri-tr";
const A_OR = "data-agri-or";
const A_ATTR_TR = "data-agri-attr-tr";
const A_OPT_TR = "data-agri-option-tr";
const A_OPT_OR = "data-agri-option-or";
const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP_BASE = `script,style,noscript,svg,code,pre,.lucide,[hidden],[aria-hidden="true"],[data-no-tr]`;
const SKIP_TEXT = `[${A_TR}],${SKIP_BASE},input,textarea,select,option`;
const SKIP_ATTR = `[${A_TR}],${SKIP_BASE}`;
const MIN_LEN = 2;
const CONCURRENCY = 3;

type TextEntry = { text: string; node: Text };
type AttrEntry = { text: string; el: HTMLElement; attr: typeof ATTRS[number] };
type OptionEntry = { text: string; el: HTMLOptionElement };

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
      if (!p || p.closest(SKIP_TEXT)) return NodeFilter.FILTER_REJECT;
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
    if (el.closest(SKIP_ATTR) || el.hasAttribute("data-no-tr")) return;
    for (const attr of ATTRS) {
      const text = el.getAttribute(attr);
      if (text && isTranslatableText(text)) {
        out.push({ text: text.trim(), el, attr });
      }
    }
  });
  return out;
}

function scanOptionNodes(): OptionEntry[] {
  const out: OptionEntry[] = [];
  document.querySelectorAll<HTMLOptionElement>("option").forEach((el) => {
    if (el.closest("[data-no-tr]")) return;
    const text = el.textContent?.trim() || "";
    if (isTranslatableText(text)) out.push({ text, el });
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

function setTranslatedOption(el: HTMLOptionElement, original: string, translated: string) {
  if (!el.hasAttribute(A_OPT_OR)) {
    el.setAttribute(A_OPT_OR, original);
  }
  el.textContent = translated;
  el.setAttribute(A_OPT_TR, "true");
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
  document.querySelectorAll<HTMLOptionElement>(`option[${A_OPT_TR}]`).forEach((el) => {
    const orig = el.getAttribute(A_OPT_OR);
    if (orig !== null) el.textContent = orig;
    el.removeAttribute(A_OPT_TR);
    el.removeAttribute(A_OPT_OR);
  });
}

function cacheKey(text: string, lang: string) {
  return `${lang}:${text}`;
}

function clearObserver(observerRef: MutableRefObject<MutationObserver | null>) {
  observerRef.current?.disconnect();
  observerRef.current = null;
}

export function usePageTranslation() {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  const cacheRef = useRef<Map<string, string>>(new Map());
  const observerRef = useRef<MutationObserver | null>(null);
  const autoTranslateRef = useRef(localStorage.getItem("agriconnect-auto-translate") === "true");
  const failureNotifiedRef = useRef(false);

  const translate = useCallback(async () => {
    const lang = i18n.language.split("-")[0];
    if (lang === "en") return;

    const entries = scanTextNodes();
    const attrEntries = scanAttributeNodes();
    const optionEntries = scanOptionNodes();
    if (entries.length === 0 && attrEntries.length === 0 && optionEntries.length === 0) return;

    const uniqueTexts = Array.from(new Set([...entries.map((e) => e.text), ...attrEntries.map((e) => e.text), ...optionEntries.map((e) => e.text)]));
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
        const hasFailure = res.some((r) => r.status === "rejected");
        if (hasFailure && !failureNotifiedRef.current) {
          failureNotifiedRef.current = true;
          toast({
            title: t("common.error"),
            description: t("auto_translate.unavailable"),
            variant: "destructive",
          });
        }
        res.forEach((r, idx) => {
          if (r.status === "fulfilled") {
            results.set(batch[idx], r.value.translated);
          }
        });
      }
      results.forEach((translated, original) => {
        cacheRef.current.set(cacheKey(original, lang), translated);
      });
      if (results.size > 0) {
        failureNotifiedRef.current = false;
      }
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
    for (const entry of optionEntries) {
      const cached = cacheRef.current.get(cacheKey(entry.text, lang));
      if (cached) {
        setTranslatedOption(entry.el, entry.text, cached);
      }
    }
  }, [i18n.language, t, toast]);

  const handleEnable = useCallback(() => {
    clearObserver(observerRef);
    translate();
    observerRef.current = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (
          (m.type === "childList" && m.addedNodes.length > 0) ||
          (m.type === "attributes" && ATTRS.includes(m.attributeName as typeof ATTRS[number]))
        ) {
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
    clearObserver(observerRef);
    restoreAll();
  }, []);

  useEffect(() => {
    const syncAutoTranslate = (enabled: boolean) => {
      autoTranslateRef.current = enabled;
      failureNotifiedRef.current = false;
      handleDisable();

      const lang = i18n.language.split("-")[0];
      if (enabled && lang !== "en") {
        window.setTimeout(handleEnable, 0);
      }
    };

    syncAutoTranslate(localStorage.getItem("agriconnect-auto-translate") === "true");

    const onAutoTranslateChanged = (event: Event) => {
      syncAutoTranslate(!!(event as CustomEvent<boolean>).detail);
    };

    window.addEventListener("auto-translate-changed", onAutoTranslateChanged);

    return () => {
      window.removeEventListener("auto-translate-changed", onAutoTranslateChanged);
      clearObserver(observerRef);
      if (autoTranslateRef.current) {
        restoreAll();
      }
    };
  }, [i18n.language, handleEnable, handleDisable]);
}
