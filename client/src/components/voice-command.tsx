import { useState, useCallback, useRef } from "react";
import { Mic, MicOff, Volume2, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

interface VoiceCommandProps {
  onSearch?: (query: string) => void;
}

type VoiceState = "idle" | "listening" | "processing" | "speaking";

const LANG_BCP: Record<string, string> = {
  en: "en-GB",
  hi: "hi-IN",
  pa: "pa-IN",
  cy: "cy-GB",
  pl: "pl-PL",
  ta: "ta-IN",
};

const NAV_PATTERNS: Record<string, Array<{ pattern: RegExp; action: string }>> = {
  en: [
    { pattern: /(?:go to|open|show me|show)\s+dashboard/i, action: "dashboard" },
    { pattern: /(?:go to|open|show me|show)\s+(?:home|marketplace)/i, action: "home" },
    { pattern: /(?:go to|open)\s+cart/i, action: "cart" },
    { pattern: /(?:sell|list)\s+(?:my )?(?:product|produce)/i, action: "photo-sell" },
    { pattern: /(?:go to|open)\s+settings/i, action: "settings" },
    { pattern: /(?:go to|open|show)\s+land/i, action: "land" },
    { pattern: /(?:go to|open|show)\s+help/i, action: "help" },
    { pattern: /(?:go to|open|show)\s+(?:share|care|food rescue)/i, action: "share" },
    { pattern: /(?:go to|open|show)\s+(?:logistics|shipping|delivery)/i, action: "logistics" },
  ],
  hi: [
    { pattern: /(?:डैशबोर्ड|पैनल)\s*(?:खोलो|दिखाओ|जाओ)/i, action: "dashboard" },
    { pattern: /(?:होम|मुखपृष्ठ|बाज़ार)\s*(?:खोलो|दिखाओ|जाओ)/i, action: "home" },
    { pattern: /(?:कार्ट|गाड़ी)\s*(?:खोलो|दिखाओ)/i, action: "cart" },
    { pattern: /(?:उत्पाद|सामान)\s*(?:बेचो|बिक्री)/i, action: "photo-sell" },
    { pattern: /(?:सेटिंग|सेटिंग्स)\s*(?:खोलो|दिखाओ)/i, action: "settings" },
    { pattern: /(?:भूमि|ज़मीन)\s*(?:खोलो|दिखाओ)/i, action: "land" },
    { pattern: /(?:सहायता|मदद)\s*(?:खोलो|दिखाओ)/i, action: "help" },
    { pattern: /(?:शेयर|साझा|खाना बचाओ)\s*(?:खोलो|दिखाओ)/i, action: "share" },
    { pattern: /(?:लॉजिस्टिक्स|डिलीवरी|शिपिंग)\s*(?:खोलो|दिखाओ)/i, action: "logistics" },
  ],
  pa: [
    { pattern: /(?:ਡੈਸ਼ਬੋਰਡ|ਪੈਨਲ)\s*(?:ਖੋਲ੍ਹੋ|ਦਿਖਾਓ)/i, action: "dashboard" },
    { pattern: /(?:ਹੋਮ|ਬਾਜ਼ਾਰ)\s*(?:ਖੋਲ੍ਹੋ|ਦਿਖਾਓ)/i, action: "home" },
    { pattern: /(?:ਕਾਰਟ)\s*(?:ਖੋਲ੍ਹੋ|ਦਿਖਾਓ)/i, action: "cart" },
    { pattern: /(?:ਉਤਪਾਦ|ਸਾਮਾਨ)\s*(?:ਵੇਚੋ)/i, action: "photo-sell" },
    { pattern: /(?:ਸੈਟਿੰਗ)\s*(?:ਖੋਲ੍ਹੋ)/i, action: "settings" },
    { pattern: /(?:ਜ਼ਮੀਨ)\s*(?:ਖੋਲ੍ਹੋ|ਦਿਖਾਓ)/i, action: "land" },
    { pattern: /(?:ਮਦਦ|ਸਹਾਇਤਾ)\s*(?:ਖੋਲ੍ਹੋ|ਦਿਖਾਓ)/i, action: "help" },
    { pattern: /(?:ਸ਼ੇਅਰ|ਸਾਂਝਾ|ਖਾਣਾ ਬਚਾਓ)\s*(?:ਖੋਲ੍ਹੋ|ਦਿਖਾਓ)/i, action: "share" },
    { pattern: /(?:ਲੌਜਿਸਟਿਕਸ|ਡਿਲੀਵਰੀ|ਸ਼ਿਪਿੰਗ)\s*(?:ਖੋਲ੍ਹੋ|ਦਿਖਾਓ)/i, action: "logistics" },
  ],
  ta: [
    { pattern: /(?:டாஷ்போர்டு|பேனல்)\s*(?:திற|காட்டு)/i, action: "dashboard" },
    { pattern: /(?:முகப்பு|சந்தை)\s*(?:திற|காட்டு)/i, action: "home" },
    { pattern: /(?:கூடை)\s*(?:திற|காட்டு)/i, action: "cart" },
    { pattern: /(?:பொருள்|விற்க)\s*(?:திற|காட்டு)/i, action: "photo-sell" },
    { pattern: /(?:அமைப்புகள்)\s*(?:திற|காட்டு)/i, action: "settings" },
    { pattern: /(?:நிலம்)\s*(?:திற|காட்டு)/i, action: "land" },
    { pattern: /(?:உதவி)\s*(?:திற|காட்டு)/i, action: "help" },
    { pattern: /(?:பகிர்|உணவு மீட்பு)\s*(?:திற|காட்டு)/i, action: "share" },
    { pattern: /(?:லாஜிஸ்டிக்ஸ்|டெலிவரி|ஷிப்பிங்)\s*(?:திற|காட்டு)/i, action: "logistics" },
  ],
  cy: [
    { pattern: /(?:agor|dangos)\s+(?:dangosfwrdd|panel)/i, action: "dashboard" },
    { pattern: /(?:agor|dangos)\s+(?:hafan|cartref)/i, action: "home" },
    { pattern: /(?:agor|dangos)\s+(?:basged|cart)/i, action: "cart" },
    { pattern: /(?:gwerthu|rhestru)\s+(?:fy )?(?:cynnyrch)/i, action: "photo-sell" },
    { pattern: /(?:agor|dangos)\s+(?:gosodiadau|settings)/i, action: "settings" },
    { pattern: /(?:agor|dangos)\s+(?:tir|land)/i, action: "land" },
    { pattern: /(?:agor|dangos)\s+(?:cymorth|help)/i, action: "help" },
    { pattern: /(?:agor|dangos)\s+(?:rhannu|gofal|achub bwyd)/i, action: "share" },
    { pattern: /(?:agor|dangos)\s+(?:logisteg|dosbarthu|cludo)/i, action: "logistics" },
  ],
  pl: [
    { pattern: /(?:otwórz|pokaż|idź do)\s+(?:panel|dashboard)/i, action: "dashboard" },
    { pattern: /(?:otwórz|pokaż|idź do)\s+(?:stron[aęy]? główn[aąeę]|home)/i, action: "home" },
    { pattern: /(?:otwórz|pokaż)\s+(?:koszyk|cart)/i, action: "cart" },
    { pattern: /(?:sprzedaj|wystaw)\s+(?:moje? )?(?:produkt|towar)/i, action: "photo-sell" },
    { pattern: /(?:otwórz|pokaż)\s+(?:ustawienia|settings)/i, action: "settings" },
    { pattern: /(?:otwórz|pokaż)\s+(?:ziemi[aęą]|land)/i, action: "land" },
    { pattern: /(?:otwórz|pokaż)\s+(?:pomoc|help)/i, action: "help" },
    { pattern: /(?:otwórz|pokaż)\s+(?:udostępnij|ratuj jedzenie|dziel się)/i, action: "share" },
    { pattern: /(?:otwórz|pokaż)\s+(?:logistyk[aęi]|dostaw[ay]|wysyłk[aęi])/i, action: "logistics" },
  ],
};

export function VoiceCommand({ onSearch }: VoiceCommandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [responseText, setResponseText] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const recognitionRef = useRef<any>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { i18n, t } = useTranslation();

  const baseLang = i18n.language.split("-")[0];

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_BCP[baseLang] || "en-GB";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [baseLang]);

  const processWithAI = useCallback(async (text: string) => {
    setVoiceState("processing");
    setAiResponse("");

    const patterns = NAV_PATTERNS[baseLang] || NAV_PATTERNS.en;
    const allPatterns = [...patterns, ...(baseLang !== "en" ? NAV_PATTERNS.en : [])];

    for (const cmd of allPatterns) {
      if (cmd.pattern.test(text)) {
        const destinations: Record<string, string> = {
          dashboard: "/dashboard",
          home: "/",
          cart: "/cart",
          "photo-sell": "/dashboard/photo-sell",
          settings: "/settings",
          land: "/land-leasing",
          help: "/farmers-help",
          share: "/share-care",
          logistics: "/logistics",
        };
        const dest = destinations[cmd.action];
        const msg = t("voice.navigating", { destination: cmd.action });
        setResponseText(msg);
        setVoiceState("speaking");
        speak(msg);
        setTimeout(() => { setLocation(dest); setIsOpen(false); setVoiceState("idle"); }, 1200);
        return;
      }
    }

    try {
      const res = await apiRequest("POST", "/api/ai/voice", {
        transcript: text,
        language: baseLang,
        context: "marketplace navigation and product search",
      });
      const data = await res.json();
      const reply = data.response || t("voice.searching", { query: text });
      setAiResponse(reply);
      setVoiceState("speaking");
      speak(reply);

      if (data.action === "search" && data.query) {
        onSearch?.(data.query);
      }
      if (data.action === "navigate" && data.path) {
        setTimeout(() => setLocation(data.path), 1500);
      }
      if (!data.action || data.action === "search_text") {
        onSearch?.(text);
      }

      setTimeout(() => {
        setVoiceState("idle");
        setTranscript("");
        setAiResponse("");
        setResponseText("");
      }, 3000);
    } catch {
      onSearch?.(text);
      setResponseText(t("voice.searching", { query: text }));
      setVoiceState("speaking");
      speak(t("voice.searching", { query: text }));
      setTimeout(() => {
        setVoiceState("idle");
        setTranscript("");
        setResponseText("");
      }, 2000);
    }
  }, [onSearch, setLocation, speak, baseLang, t]);

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast({
        title: t("voice.not_supported"),
        description: t("voice.not_supported_desc"),
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = LANG_BCP[baseLang] || "en-GB";

    recognition.onstart = () => { setVoiceState("listening"); setTranscript(""); };

    recognition.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const txt = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += txt;
        else interim += txt;
      }
      setTranscript(final || interim);
      if (final) processWithAI(final);
    };

    recognition.onerror = (event: any) => {
      setVoiceState("idle");
      if (event.error !== "aborted") {
        toast({ title: t("common.error"), description: event.error, variant: "destructive" });
      }
    };

    recognition.onend = () => {
      if (voiceState === "listening") setVoiceState("idle");
    };

    recognition.start();
  }, [toast, voiceState, processWithAI, baseLang, t]);

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(startListening, 400);
  };

  const handleClose = () => {
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
    setIsOpen(false);
    setVoiceState("idle");
    setTranscript("");
    setAiResponse("");
    setResponseText("");
  };

  const suggestions = [t("voice.find_organic"), t("voice.go_dashboard"), t("voice.open_cart"), t("voice.sell_produce"), t("voice.show_land")];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className="h-8 w-8 relative hover:bg-primary/5 transition-colors"
        data-testid="button-voice-command"
        title={t("voice.title")}
      >
        <Mic className={`h-5 w-5 ${voiceState === "listening" ? "text-primary animate-pulse" : ""}`} />
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("voice.title")}
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {baseLang.toUpperCase()}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center py-6">
            <AnimatePresence mode="wait">
              {voiceState === "listening" && (
                <motion.div key="listening" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="relative">
                  <motion.div
                    className="absolute inset-0 bg-primary/20 rounded-full"
                    animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                  <motion.div
                    className="absolute inset-0 bg-primary/10 rounded-full"
                    animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                  />
                  <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    <Mic className="h-10 w-10 text-primary-foreground" />
                  </div>
                </motion.div>
              )}
              {voiceState === "processing" && (
                <motion.div key="processing" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                </motion.div>
              )}
              {voiceState === "speaking" && (
                <motion.div key="speaking" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <Volume2 className="h-10 w-10 text-white" />
                </motion.div>
              )}
              {voiceState === "idle" && (
                <motion.button key="idle" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} onClick={startListening} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-24 h-24 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                  <Mic className="h-10 w-10 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>

            <div className="mt-6 text-center min-h-[70px] max-w-xs">
              {voiceState === "listening" && <p className="text-muted-foreground text-sm">{t("voice.listening")}</p>}
              {transcript && <p className="text-base font-medium">"{transcript}"</p>}
              {(responseText || aiResponse) && (
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-primary font-medium text-sm mt-1">
                  {aiResponse || responseText}
                </motion.p>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-2">{t("voice.try_saying")}</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map(s => (
                <Badge key={s} variant="secondary" className="text-[10px] cursor-pointer hover:bg-primary/10" onClick={() => processWithAI(s)}>{s}</Badge>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
