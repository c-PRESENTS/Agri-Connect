import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import pa from "./locales/pa.json";
import cy from "./locales/cy.json";
import pl from "./locales/pl.json";
import ta from "./locales/ta.json";

export const SUPPORTED_LANGUAGES = ["en", "hi", "pa", "cy", "pl", "ta"] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

const isBrowser = typeof window !== "undefined";
const savedLang = isBrowser ? localStorage.getItem("agriconnect-lang") || "en" : "en";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      pa: { translation: pa },
      cy: { translation: cy },
      pl: { translation: pl },
      ta: { translation: ta },
    },
    lng: savedLang,
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

export default i18n;
