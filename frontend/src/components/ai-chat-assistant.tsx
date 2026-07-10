import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function AIChatAssistant() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("chat.welcome"),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await apiRequest("POST", "/api/chat", {
        message: userMessage.content,
        conversationHistory,
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply || t("chat.no_response"),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      const status = error?.status ?? (typeof error?.message === "string" && error.message.match(/^(\d{3}):/)?.[1]);
      let content = t("chat.error_generic");
      if (status === 401 || String(error?.message || "").includes("401")) {
        content = t("chat.error_auth");
      } else if (status === 429 || String(error?.message || "").includes("429")) {
        content = t("chat.error_rate_limit");
      } else if (String(error?.message || "").toLowerCase().includes("failed to fetch")) {
        content = t("chat.error_network");
      }
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    t("chat.q1"),
    t("chat.q2"),
    t("chat.q3"),
    t("chat.q4"),
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 left-3 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-background border rounded-2xl shadow-2xl overflow-hidden md:left-20"
            data-testid="chat-dialog"
          >
            <div className="bg-gradient-to-r from-primary to-green-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{t("chat.title")}</h3>
                  <p className="text-xs text-white/80">{t("chat.powered_by_ai")}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20"
                data-testid="button-close-chat"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <ScrollArea className="h-[350px] p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 max-w-[80%] ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}

                {messages.length === 1 && !isLoading && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">{t("chat.try_asking")}</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedQuestions.map((question, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="cursor-pointer text-xs"
                          onClick={() => {
                            setInput(question);
                          }}
                          data-testid={`suggested-question-${i}`}
                        >
                          {question}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background/50">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t("chat.placeholder")}
                  disabled={isLoading}
                  className="flex-1"
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="fixed bottom-20 left-3 z-50 md:bottom-6 md:left-20"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? t("chat.close_label") : t("chat.open_label")}
          className="h-12 w-12 md:h-14 md:w-14 p-0 rounded-full bg-gradient-to-br from-primary to-green-600 shadow-xl shadow-primary/40 ring-2 ring-white/40 hover:shadow-primary/60 transition-shadow flex items-center justify-center"
          data-testid="button-open-chat"
        >
          {isOpen ? (
            <X className="h-5 w-5 md:h-6 md:w-6 text-white" strokeWidth={2.5} />
          ) : (
            <span className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/30 opacity-60 animate-ping" />
              <Bot className="h-5 w-5 md:h-6 md:w-6 text-white relative z-10" strokeWidth={2.2} />
              <Sparkles className="h-3 w-3 absolute -top-1.5 -right-1.5 text-yellow-300 drop-shadow z-10" strokeWidth={2.5} />
            </span>
          )}
        </Button>
      </motion.div>
    </>
  );
}
