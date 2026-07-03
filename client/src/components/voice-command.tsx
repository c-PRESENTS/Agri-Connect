import { useState, useCallback, useRef } from "react";
import { Mic, MicOff, Volume2, X, Loader2, Sparkles, Repeat, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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

type ConversationTurn = {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
};

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
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const recognitionRef = useRef<any>(null);
  const [continuous, setContinuous] = useState(false);
  const [audioCues, setAudioCues] = useState(() => localStorage.getItem("agri-voice-cues") !== "false");
  const continuousRef = useRef(false);
  const audioCuesRef = useRef(audioCues);
  const restartRef = useRef<(() => void) | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { i18n, t } = useTranslation();

  const baseLang = i18n.language.split("-")[0];

  const playBeep = useCallback((type: "start" | "done" | "error") => {
    if (!audioCuesRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      if (type === "start") {
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "done") {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
      osc.connect(gain);
      gain.connect(ctx.destination);
    } catch { /* audio not available */ }
  }, []);

  const toggleContinuous = useCallback(() => {
    setContinuous((prev) => {
      const next = !prev;
      continuousRef.current = next;
      return next;
    });
  }, []);

  const toggleAudioCues = useCallback(() => {
    setAudioCues((prev) => {
      const next = !prev;
      audioCuesRef.current = next;
      localStorage.setItem("agri-voice-cues", String(next));
      return next;
    });
  }, []);

  const completeCommand = useCallback(() => {
    setTranscript("");
    setAiResponse("");
    setResponseText("");
    if (continuousRef.current) {
      setVoiceState("listening");
      setTimeout(() => restartRef.current?.(), 600);
    } else {
      setVoiceState("idle");
    }
  }, []);

  const clearConversation = useCallback(() => {
    setConversation([]);
    setTranscript("");
    setAiResponse("");
    setResponseText("");
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_BCP[baseLang] || "en-GB";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [baseLang]);

  const processWithAI = useCallback(async (text: string, silent = false) => {
    setVoiceState("processing");
    setAiResponse("");
    if (!silent) playBeep("start");

    // Add user turn to conversation
    const userTurn: ConversationTurn = { role: "user", text, timestamp: Date.now() };
    setConversation(prev => [...prev, userTurn]);

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
        setAiResponse(msg);
        setVoiceState("speaking");
        // Add assistant turn
        const assistantTurn: ConversationTurn = { role: "assistant", text: msg, timestamp: Date.now() };
        setConversation(prev => [...prev, assistantTurn]);
        speak(msg);
        setTimeout(() => { setLocation(dest); setIsOpen(false); setVoiceState("idle"); }, 1200);
        return;
      }
    }

    try {
      // Send conversation history for multi-turn context
      const res = await apiRequest("POST", "/api/ai/voice", {
        transcript: text,
        language: baseLang,
        context: "marketplace navigation and product search",
        conversationHistory: conversation.slice(-10).map(t => ({ role: t.role, text: t.text })),
      });
      const data = await res.json();
      const reply = data.response || t("voice.searching", { query: text });
      setAiResponse(reply);
      setResponseText(reply);
      setVoiceState("speaking");
      // Add assistant turn
      const assistantTurn: ConversationTurn = { role: "assistant", text: reply, timestamp: Date.now() };
      setConversation(prev => [...prev, assistantTurn]);
      speak(reply);
      playBeep("done");

      if (data.action === "search" && data.query) {
        onSearch?.(data.query);
      }
      if (data.action === "navigate" && data.path) {
        setTimeout(() => setLocation(data.path), 1500);
      }
      if (!data.action || data.action === "search_text") {
        onSearch?.(text);
      }

      setTimeout(completeCommand, 3000);
    } catch {
      onSearch?.(text);
      const fallbackMsg = t("voice.searching", { query: text });
      setResponseText(fallbackMsg);
      setAiResponse(fallbackMsg);
      setVoiceState("speaking");
      const assistantTurn: ConversationTurn = { role: "assistant", text: fallbackMsg, timestamp: Date.now() };
      setConversation(prev => [...prev, assistantTurn]);
      speak(fallbackMsg);
      setTimeout(completeCommand, 2000);
    }
  }, [onSearch, setLocation, speak, baseLang, t, playBeep, completeCommand, conversation]);

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

    recognition.continuous = continuousRef.current;
    recognition.interimResults = true;
    recognition.lang = LANG_BCP[baseLang] || "en-GB";

    recognition.onstart = () => {
      setVoiceState("listening");
      setTranscript("");
      playBeep("start");
    };

    recognition.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const txt = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += txt;
        else interim += txt;
      }
      setTranscript(final || interim);
      if (final) processWithAI(final, false);
    };

    recognition.onerror = (event: any) => {
      setVoiceState("idle");
      if (event.error !== "aborted") {
        toast({ title: t("common.error"), description: event.error, variant: "destructive" });
      }
    };

    recognition.onend = () => {
      setVoiceState("idle");
    };

    recognition.start();
  }, [toast, processWithAI, baseLang, t, playBeep]);

  restartRef.current = startListening;

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
    // Don't clear conversation on close — keep history for next open
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
              {conversation.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-1"
                  onClick={clearConversation}
                  title="New conversation"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Conversation History */}
          {conversation.length > 0 && (
            <div className="max-h-[200px] overflow-y-auto space-y-2 px-1 py-2" data-testid="conversation-history">
              {conversation.map((turn, i) => (
                <div
                  key={i}
                  className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-[12px] ${
                      turn.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {turn.role === "assistant" && <Sparkles className="h-2.5 w-2.5 text-primary" />}
                      <span className="text-[9px] font-bold uppercase opacity-60">
                        {turn.role === "user" ? "You" : "AI"}
                      </span>
                    </div>
                    {turn.text}
                  </div>
                </div>
              ))}
            </div>
          )}

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
                <Badge key={s} variant="secondary" className="text-[10px] cursor-pointer hover:bg-primary/10" onClick={() => processWithAI(s, true)}>{s}</Badge>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t">
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer select-none">
                <Switch checked={continuous} onCheckedChange={toggleContinuous} className="scale-75" />
                <span className="flex items-center gap-1">
                  <Repeat className="h-3 w-3" />
                  {t("voice.continuous")}
                </span>
              </label>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer select-none">
                <Switch checked={audioCues} onCheckedChange={toggleAudioCues} className="scale-75" />
                <span className="flex items-center gap-1">
                  <Volume2 className="h-3 w-3" />
                  {t("voice.audio_cues")}
                </span>
              </label>
            </div>
            {conversation.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-[10px] text-muted-foreground text-center">
                  <MessageSquare className="h-3 w-3 inline mr-1" />
                  {conversation.length} turns in conversation
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
