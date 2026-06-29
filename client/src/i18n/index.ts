import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import pa from "./locales/pa.json";
import cy from "./locales/cy.json";
import pl from "./locales/pl.json";
import ta from "./locales/ta.json";

const savedLang = localStorage.getItem("agriconnect-lang") || "en";

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
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
