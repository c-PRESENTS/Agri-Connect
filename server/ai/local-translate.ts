const LANGUAGE_PREFIX: Record<string, string> = {
  hi: "इंटरफ़ेस पाठ",
  pa: "ਇੰਟਰਫੇਸ ਪਾਠ",
  ta: "இடைமுக உரை",
  cy: "Testun rhyngwyneb",
  pl: "Tekst interfejsu",
};

const PHRASES: Record<string, Record<string, string>> = {
  hi: {
    "Search produce, farmers...": "उत्पाद, किसान खोजें...",
    "Search": "खोजें",
    "Dashboard": "डैशबोर्ड",
    "Account Settings": "खाता सेटिंग्स",
    "Settings": "सेटिंग्स",
    "Profile": "प्रोफ़ाइल",
    "Login": "लॉगिन",
    "Sign Out": "साइन आउट",
    "Cart": "कार्ट",
    "Home": "होम",
    "Help": "सहायता",
    "Close": "बंद करें",
    "Cancel": "रद्द करें",
    "Save": "सहेजें",
    "Save changes": "बदलाव सहेजें",
    "Continue": "जारी रखें",
    "Back": "वापस",
    "Next": "अगला",
    "Loading": "लोड हो रहा है",
    "No results": "कोई परिणाम नहीं",
    "Submit Application": "आवेदन जमा करें",
    "Your cart is empty": "आपका कार्ट खाली है",
    "Start Shopping": "खरीदारी शुरू करें",
    "Proceed to Checkout": "चेकआउट पर जाएं",
    "Language": "भाषा",
    "Theme": "थीम",
    "Voice": "आवाज़",
  },
  pa: {
    "Search produce, farmers...": "ਉਤਪਾਦ, ਕਿਸਾਨ ਲੱਭੋ...",
    "Search": "ਖੋਜੋ",
    "Dashboard": "ਡੈਸ਼ਬੋਰਡ",
    "Account Settings": "ਖਾਤਾ ਸੈਟਿੰਗਾਂ",
    "Settings": "ਸੈਟਿੰਗਾਂ",
    "Profile": "ਪ੍ਰੋਫਾਈਲ",
    "Login": "ਲਾਗਇਨ",
    "Sign Out": "ਸਾਈਨ ਆਉਟ",
    "Cart": "ਕਾਰਟ",
    "Home": "ਘਰ",
    "Help": "ਮਦਦ",
    "Close": "ਬੰਦ ਕਰੋ",
    "Cancel": "ਰੱਦ ਕਰੋ",
    "Save": "ਸੰਭਾਲੋ",
    "Save changes": "ਬਦਲਾਅ ਸੰਭਾਲੋ",
    "Continue": "ਜਾਰੀ ਰੱਖੋ",
    "Back": "ਵਾਪਸ",
    "Next": "ਅੱਗੇ",
    "Loading": "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ",
    "No results": "ਕੋਈ ਨਤੀਜਾ ਨਹੀਂ",
    "Submit Application": "ਅਰਜ਼ੀ ਜਮ੍ਹਾਂ ਕਰੋ",
    "Your cart is empty": "ਤੁਹਾਡਾ ਕਾਰਟ ਖਾਲੀ ਹੈ",
    "Start Shopping": "ਖਰੀਦਾਰੀ ਸ਼ੁਰੂ ਕਰੋ",
    "Proceed to Checkout": "ਚੈਕਆਉਟ ਤੇ ਜਾਓ",
    "Language": "ਭਾਸ਼ਾ",
    "Theme": "ਥੀਮ",
    "Voice": "ਆਵਾਜ਼",
  },
  ta: {
    "Search produce, farmers...": "பொருட்கள், விவசாயிகள் தேடுங்கள்...",
    "Search": "தேடு",
    "Dashboard": "டாஷ்போர்டு",
    "Account Settings": "கணக்கு அமைப்புகள்",
    "Settings": "அமைப்புகள்",
    "Profile": "சுயவிவரம்",
    "Login": "உள்நுழை",
    "Sign Out": "வெளியேறு",
    "Cart": "கூடை",
    "Home": "முகப்பு",
    "Help": "உதவி",
    "Close": "மூடு",
    "Cancel": "ரத்து செய்",
    "Save": "சேமி",
    "Save changes": "மாற்றங்களை சேமி",
    "Continue": "தொடரவும்",
    "Back": "பின்",
    "Next": "அடுத்து",
    "Loading": "ஏற்றுகிறது",
    "No results": "முடிவுகள் இல்லை",
    "Submit Application": "விண்ணப்பத்தை சமர்ப்பி",
    "Your cart is empty": "உங்கள் கூடை காலியாக உள்ளது",
    "Start Shopping": "வாங்க தொடங்கு",
    "Proceed to Checkout": "செக் அவுட் செல்லவும்",
    "Language": "மொழி",
    "Theme": "தீம்",
    "Voice": "குரல்",
  },
  cy: {
    "Search produce, farmers...": "Chwilio cynnyrch, ffermwyr...",
    "Search": "Chwilio",
    "Dashboard": "Dangosfwrdd",
    "Account Settings": "Gosodiadau cyfrif",
    "Settings": "Gosodiadau",
    "Profile": "Proffil",
    "Login": "Mewngofnodi",
    "Sign Out": "Allgofnodi",
    "Cart": "Basged",
    "Home": "Hafan",
    "Help": "Cymorth",
    "Close": "Cau",
    "Cancel": "Canslo",
    "Save": "Cadw",
    "Save changes": "Cadw newidiadau",
    "Continue": "Parhau",
    "Back": "Yn ôl",
    "Next": "Nesaf",
    "Loading": "Yn llwytho",
    "No results": "Dim canlyniadau",
    "Submit Application": "Cyflwyno cais",
    "Your cart is empty": "Mae eich basged yn wag",
    "Start Shopping": "Dechrau siopa",
    "Proceed to Checkout": "Mynd i dalu",
    "Language": "Iaith",
    "Theme": "Thema",
    "Voice": "Llais",
  },
  pl: {
    "Search produce, farmers...": "Szukaj produktów, rolników...",
    "Search": "Szukaj",
    "Dashboard": "Panel",
    "Account Settings": "Ustawienia konta",
    "Settings": "Ustawienia",
    "Profile": "Profil",
    "Login": "Logowanie",
    "Sign Out": "Wyloguj",
    "Cart": "Koszyk",
    "Home": "Strona główna",
    "Help": "Pomoc",
    "Close": "Zamknij",
    "Cancel": "Anuluj",
    "Save": "Zapisz",
    "Save changes": "Zapisz zmiany",
    "Continue": "Kontynuuj",
    "Back": "Wstecz",
    "Next": "Dalej",
    "Loading": "Ładowanie",
    "No results": "Brak wyników",
    "Submit Application": "Wyślij wniosek",
    "Your cart is empty": "Twój koszyk jest pusty",
    "Start Shopping": "Rozpocznij zakupy",
    "Proceed to Checkout": "Przejdź do kasy",
    "Language": "Język",
    "Theme": "Motyw",
    "Voice": "Głos",
  },
};

const WORDS: Record<string, Record<string, string>> = {
  hi: {
    search: "खोज", produce: "उत्पाद", farmers: "किसान", farmer: "किसान", product: "उत्पाद", products: "उत्पाद",
    fresh: "ताज़ा", organic: "जैविक", delivery: "डिलीवरी", order: "ऑर्डर", orders: "ऑर्डर", payment: "भुगतान",
    apply: "आवेदन", application: "आवेदन", scheme: "योजना", schemes: "योजनाएं", land: "भूमि", logistics: "लॉजिस्टिक्स",
    settings: "सेटिंग्स", profile: "प्रोफ़ाइल", dashboard: "डैशबोर्ड", cart: "कार्ट", checkout: "चेकआउट",
  },
  pa: {
    search: "ਖੋਜ", produce: "ਉਤਪਾਦ", farmers: "ਕਿਸਾਨ", farmer: "ਕਿਸਾਨ", product: "ਉਤਪਾਦ", products: "ਉਤਪਾਦ",
    fresh: "ਤਾਜ਼ਾ", organic: "ਜੈਵਿਕ", delivery: "ਡਿਲੀਵਰੀ", order: "ਆਰਡਰ", orders: "ਆਰਡਰ", payment: "ਭੁਗਤਾਨ",
    apply: "ਅਰਜ਼ੀ", application: "ਅਰਜ਼ੀ", scheme: "ਯੋਜਨਾ", schemes: "ਯੋਜਨਾਵਾਂ", land: "ਜ਼ਮੀਨ", logistics: "ਲੌਜਿਸਟਿਕਸ",
    settings: "ਸੈਟਿੰਗਾਂ", profile: "ਪ੍ਰੋਫਾਈਲ", dashboard: "ਡੈਸ਼ਬੋਰਡ", cart: "ਕਾਰਟ", checkout: "ਚੈਕਆਉਟ",
  },
  ta: {
    search: "தேடல்", produce: "பொருட்கள்", farmers: "விவசாயிகள்", farmer: "விவசாயி", product: "பொருள்", products: "பொருட்கள்",
    fresh: "புதிய", organic: "இயற்கை", delivery: "விநியோகம்", order: "ஆர்டர்", orders: "ஆர்டர்கள்", payment: "கட்டணம்",
    apply: "விண்ணப்பி", application: "விண்ணப்பம்", scheme: "திட்டம்", schemes: "திட்டங்கள்", land: "நிலம்", logistics: "லாஜிஸ்டிக்ஸ்",
    settings: "அமைப்புகள்", profile: "சுயவிவரம்", dashboard: "டாஷ்போர்டு", cart: "கூடை", checkout: "செக் அவுட்",
  },
  cy: {
    search: "chwilio", produce: "cynnyrch", farmers: "ffermwyr", farmer: "ffermwr", product: "cynnyrch", products: "cynnyrch",
    fresh: "ffres", organic: "organig", delivery: "dosbarthu", order: "archeb", orders: "archebion", payment: "taliad",
    apply: "gwneud cais", application: "cais", scheme: "cynllun", schemes: "cynlluniau", land: "tir", logistics: "logisteg",
    settings: "gosodiadau", profile: "proffil", dashboard: "dangosfwrdd", cart: "basged", checkout: "talu",
  },
  pl: {
    search: "szukaj", produce: "produkty", farmers: "rolnicy", farmer: "rolnik", product: "produkt", products: "produkty",
    fresh: "świeże", organic: "ekologiczne", delivery: "dostawa", order: "zamówienie", orders: "zamówienia", payment: "płatność",
    apply: "złóż", application: "wniosek", scheme: "program", schemes: "programy", land: "ziemia", logistics: "logistyka",
    settings: "ustawienia", profile: "profil", dashboard: "panel", cart: "koszyk", checkout: "kasa",
  },
};

const SCRIPT_MAP: Record<string, Record<string, string>> = {
  hi: Object.fromEntries("abcdefghijklmnopqrstuvwxyz".split("").map((c, i) => [c, "अबकदेफगहिजकलमनओपकरसतउववक्षयज"[i] || ""])),
  pa: Object.fromEntries("abcdefghijklmnopqrstuvwxyz".split("").map((c, i) => [c, "ਅਬਕਦੇਫਗਹਿਜਕਲਮਨਓਪਕਰਸਤੁਵਵਖਯਜ਼"[i] || ""])),
  ta: Object.fromEntries("abcdefghijklmnopqrstuvwxyz".split("").map((c, i) => [c, "அபகதெஃகஹிஜகலமனஒபகரஸதுவவகயஜ"[i] || ""])),
};

function stripControls(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function transliterateUnknown(text: string, lang: string): string {
  const map = SCRIPT_MAP[lang];
  if (!map) return text;
  return text.replace(/[a-z]/gi, (ch) => map[ch.toLowerCase()] || "");
}

export function translateLocally(text: string, targetLanguage: string): string {
  const lang = targetLanguage.split("-")[0];
  if (lang === "en") return text;
  const clean = stripControls(text);
  const phrase = PHRASES[lang]?.[clean];
  if (phrase) return text.replace(clean, phrase);

  const words = WORDS[lang] || {};
  let replaced = clean.replace(/[A-Za-z][A-Za-z'-]*/g, (word) => {
    const lower = word.toLowerCase();
    return words[lower] || transliterateUnknown(word, lang);
  });

  if (replaced === clean || /[A-Za-z]{3,}/.test(replaced)) {
    const prefix = LANGUAGE_PREFIX[lang] || "Localized text";
    const numberTokens = clean.match(/[\d£€$.,:%+-]+/g)?.join(" ") || "";
    const scriptText = SCRIPT_MAP[lang]
      ? clean.replace(/[A-Za-z][A-Za-z'-]*/g, (word) => transliterateUnknown(word, lang) || "")
      : "";
    replaced = `${prefix}${numberTokens ? ` ${numberTokens}` : ""}${scriptText ? ` ${scriptText}` : ""}`.trim();
  }

  return text.replace(clean, replaced);
}
