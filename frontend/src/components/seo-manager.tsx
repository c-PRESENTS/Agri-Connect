import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { getSeoRouteKey } from "@/lib/public-routes";

function setDescription(content: string) {
  let meta = document.querySelector('meta[name="description"]');

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function setCanonicalUrl(href: string) {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }

  canonical.setAttribute("href", href);
}

export function SeoManager() {
  const [location] = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const routeKey = getSeoRouteKey(location);
    const fallbackTitle = t("seo.default.title");
    const fallbackDescription = t("seo.default.description");
    const title = t(`seo.${routeKey}.title`, { defaultValue: fallbackTitle });
    const description = t(`seo.${routeKey}.description`, { defaultValue: fallbackDescription });
    const canonicalUrl = new URL(location, window.location.origin).toString();
    const socialImageUrl = new URL("/icons/icon-512x512.png", window.location.origin).toString();

    document.title = title;
    setDescription(description);
    setCanonicalUrl(canonicalUrl);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:image"]', "property", "og:image", socialImageUrl);
    setMeta('meta[property="og:site_name"]', "property", "og:site_name", "AgriConnect");
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", socialImageUrl);
  }, [i18n.resolvedLanguage, location, t]);

  return null;
}
