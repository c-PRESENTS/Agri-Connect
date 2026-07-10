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

export function SeoManager() {
  const [location] = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const routeKey = getSeoRouteKey(location);
    const fallbackTitle = t("seo.default.title");
    const fallbackDescription = t("seo.default.description");
    const title = t(`seo.${routeKey}.title`, { defaultValue: fallbackTitle });
    const description = t(`seo.${routeKey}.description`, { defaultValue: fallbackDescription });

    document.title = title;
    setDescription(description);
  }, [i18n.resolvedLanguage, location, t]);

  return null;
}
