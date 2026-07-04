export const LANG_BCP: Record<string, string> = {
  en: "en-GB",
  hi: "hi-IN",
  pa: "pa-IN",
  ta: "ta-IN",
  cy: "cy-GB",
  pl: "pl-PL",
};

export type VoiceAction =
  | { kind: "navigate"; path: string; label: string }
  | { kind: "search"; query: string }
  | { kind: "back" }
  | { kind: "forward" }
  | { kind: "scroll"; direction: "up" | "down" | "top" | "bottom" }
  | { kind: "readPage" }
  | { kind: "stopSpeech" }
  | { kind: "openCategories" };

const ROUTES = [
  { label: "home", path: "/", aliases: ["home", "marketplace", "shop", "browse products", "घर", "होम", "முகப்பு", "ਘਰ"] },
  { label: "dashboard", path: "/dashboard", aliases: ["dashboard", "farmer dashboard", "panel", "डैशबोर्ड", "ਡੈਸ਼ਬੋਰਡ"] },
  { label: "sell", path: "/dashboard/photo-sell", aliases: ["sell", "photo sell", "list product", "sell produce", "बेचो", "ਵੇਚੋ", "விற்க"] },
  { label: "schemes", path: "/government-schemes", aliases: ["schemes", "government schemes", "subsidies", "योजना"] },
  { label: "settings", path: "/settings", aliases: ["settings", "account settings", "profile settings", "सेटिंग"] },
  { label: "help", path: "/farmers-help", aliases: ["help", "knowledge", "farmers help", "learn", "मदद", "உதவி", "ਮਦਦ"] },
  { label: "land", path: "/land-leasing", aliases: ["land", "land leasing", "lease land", "भूमि", "ज़मीन", "நிலம்", "ਜ਼ਮੀਨ"] },
  { label: "logistics", path: "/logistics", aliases: ["logistics", "delivery", "shipping partners", "डिलीवरी"] },
  { label: "ship", path: "/ship", aliases: ["ship", "send parcel", "shipping", "parcels"] },
  { label: "share", path: "/share-care", aliases: ["share", "share care", "food rescue", "donate food", "साझा"] },
  { label: "cart", path: "/cart", aliases: ["cart", "basket", "shopping cart", "कार्ट", "கூடை"] },
  { label: "agritech", path: "/agritech", aliases: ["agritech", "technology", "farm tech"] },
  { label: "map", path: "/map", aliases: ["map", "smart map", "nearby farms", "नक्शा"] },
  { label: "orders", path: "/orders", aliases: ["orders", "my orders", "order history"] },
  { label: "checkout", path: "/checkout", aliases: ["checkout", "payment", "pay"] },
  { label: "support", path: "/support", aliases: ["support", "customer support", "contact support"] },
  { label: "about", path: "/about", aliases: ["about", "about us"] },
  { label: "seller", path: "/seller", aliases: ["seller", "seller hub", "store"] },
  { label: "compare", path: "/compare", aliases: ["compare", "compare products"] },
];

function normalizeSpeech(text: string) {
  return text.toLocaleLowerCase().trim().replace(/\s+/g, " ");
}

function includesAlias(command: string, alias: string) {
  const value = alias.toLocaleLowerCase().trim();
  return command === value || command.includes(value);
}

export function parseVoiceAction(text: string): VoiceAction | null {
  const command = normalizeSpeech(text);

  if (/(^| )(go back|back|previous|पीछे|ਵਾਪਸ|பின்|wstecz)( |$)/i.test(command)) return { kind: "back" };
  if (/(go forward|forward|next page|आगे|ਅੱਗੇ|முன்|dalej)/i.test(command)) return { kind: "forward" };
  if (/(stop speaking|stop reading|stop|quiet|cancel|रुको|ਬੰਦ|நிறுத்த)/i.test(command)) return { kind: "stopSpeech" };
  if (/(read page|read this|listen page|speak page|पढ़ो|ਸੁਣਾਓ|படி)/i.test(command)) return { kind: "readPage" };
  if (/(open categories|show categories|browse categories)/i.test(command)) return { kind: "openCategories" };
  if (/(scroll down|page down|नीचे|ਥੱਲੇ|கீழே)/i.test(command)) return { kind: "scroll", direction: "down" };
  if (/(scroll up|page up|ऊपर|ਉੱਪਰ|மேலே)/i.test(command)) return { kind: "scroll", direction: "up" };
  if (/(go to top|top|शीर्ष)/i.test(command)) return { kind: "scroll", direction: "top" };
  if (/(go to bottom|bottom|अंत)/i.test(command)) return { kind: "scroll", direction: "bottom" };

  for (const route of ROUTES) {
    if (route.aliases.some((alias) => includesAlias(command, alias))) {
      return { kind: "navigate", path: route.path, label: route.label };
    }
  }

  const searchMatch = command.match(/(?:search for|find|show me|look for)\s+(.+)/i);
  if (searchMatch?.[1]) return { kind: "search", query: searchMatch[1].trim() };

  return null;
}

export function getReadablePageText(root: ParentNode = document) {
  const main = root.querySelector("main") || root.querySelector("[role='main']") || document.body;
  const clone = main.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll("script, style, svg, nav, button, input, textarea, select, [aria-hidden='true']")
    .forEach((node) => node.remove());

  return (clone.innerText || clone.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4500);
}

export function speakText(text: string, lang: string, onDone?: () => void) {
  if (!("speechSynthesis" in window) || !text.trim()) return false;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_BCP[lang] || "en-GB";
  utterance.rate = 0.9;
  utterance.pitch = 1;

  const voicePrefix = utterance.lang.split("-")[0].toLocaleLowerCase();
  const voice = window.speechSynthesis
    .getVoices()
    .find((item) => item.lang.toLocaleLowerCase().startsWith(voicePrefix));
  if (voice) utterance.voice = voice;

  utterance.onend = () => onDone?.();
  utterance.onerror = () => onDone?.();
  window.speechSynthesis.speak(utterance);
  return true;
}
