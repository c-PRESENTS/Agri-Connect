import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";

export const SUPPORTED_LANGUAGES = ["en", "hi", "pa", "cy", "pl", "ta"] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

const isBrowser = typeof window !== "undefined";
const savedLang = isBrowser ? localStorage.getItem("agriconnect-lang") || "en" : "en";
const initialLang = isSupportedLanguage(savedLang) ? savedLang : "en";

const localeLoaders: Record<Exclude<SupportedLanguage, "en">, () => Promise<Record<string, unknown>>> = {
  hi: () => import("./locales/hi.json").then((module) => module.default),
  pa: () => import("./locales/pa.json").then((module) => module.default),
  cy: () => import("./locales/cy.json").then((module) => module.default),
  pl: () => import("./locales/pl.json").then((module) => module.default),
  ta: () => import("./locales/ta.json").then((module) => module.default),
};

function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

export async function loadLanguageResources(lang: string): Promise<SupportedLanguage> {
  const baseLang = lang.split("-")[0];
  const supportedLang = isSupportedLanguage(baseLang) ? baseLang : "en";

  if (i18n.hasResourceBundle(supportedLang, "translation")) {
    return supportedLang;
  }

  if (supportedLang === "en") {
    i18n.addResourceBundle("en", "translation", en, true, true);
    return "en";
  }

  const resources = await localeLoaders[supportedLang]();
  i18n.addResourceBundle(supportedLang, "translation", resources, true, true);
  return supportedLang;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    lng: initialLang,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    returnEmptyString: false,
    returnNull: false,
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "agriconnect-lang",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

if (initialLang !== "en") {
  loadLanguageResources(initialLang).then((lang) => {
    if (i18n.language.split("-")[0] === lang) {
      i18n.changeLanguage(lang);
    }
  });
}

export default i18n;
