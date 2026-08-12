import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, CheckCheck, Clock3, MapPin, MessageSquare, Send, ShieldCheck } from "lucide-react";
import type {
  MarketplaceConversationMessagesPage,
  MarketplaceConversationSummary,
  Product,
} from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SafeProductImage } from "@/components/safe-product-image";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/currency-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { resolveProductImageForProduct } from "@/lib/product-images";

const QUICK_QUESTIONS = [
  "Is this product currently available?",
  "When was it harvested or prepared?",
  "Can you deliver to my location?",
  "Is collection from the farm available?",
  "Can I order a larger quantity?",
  "Do you offer a bulk price?",
];

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function ProductConversation({ product }: { product: Product }) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { format } = useCurrency();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState(1);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const isSeller = user?.id === product.farmerId;
  const conversationsUrl = `/api/conversations?productId=${encodeURIComponent(product.id)}`;

  const { data: conversations = [], isLoading: conversationsLoading, isError: conversationsError } = useQuery<MarketplaceConversationSummary[]>({
    queryKey: [conversationsUrl],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!activeConversationId && conversations[0]) setActiveConversationId(conversations[0].id);
    if (activeConversationId && !conversations.some((conversation) => conversation.id === activeConversationId)) {
      setActiveConversationId(conversations[0]?.id ?? null);
    }
  }, [activeConversationId, conversations]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );
  const messagesUrl = activeConversationId
    ? `/api/conversations/${activeConversationId}/messages?page=${page}&pageSize=50`
    : "";
  const { data: messagePage, isLoading: messagesLoading } = useQuery<MarketplaceConversationMessagesPage>({
    queryKey: [messagesUrl],
    enabled: Boolean(activeConversationId),
    refetchInterval: 10_000,
  });

  const createConversation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/conversations", { productId: product.id })).json() as Promise<MarketplaceConversationSummary>,
    onSuccess: (conversation) => {
      setActiveConversationId(conversation.id);
      queryClient.invalidateQueries({ queryKey: [conversationsUrl] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) =>
      (await apiRequest("POST", `/api/conversations/${conversationId}/messages`, { content })).json(),
    onSuccess: (_, variables) => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: [conversationsUrl] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${variables.conversationId}/messages?page=${page}&pageSize=50`] });
    },
  });

  const submitMessage = async () => {
    const content = draft.trim();
    if (!content || sendMessage.isPending || createConversation.isPending) return;
    try {
      const conversation = activeConversation ?? await createConversation.mutateAsync();
      await sendMessage.mutateAsync({ conversationId: conversation.id, content });
    } catch (error) {
      toast({ title: "Conversation unavailable", description: error instanceof Error ? error.message : "Unable to contact this farmer", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!activeConversationId || !messagePage?.messages.length) return;
    apiRequest("POST", `/api/conversations/${activeConversationId}/read`, {})
      .then(() => queryClient.invalidateQueries({ queryKey: [conversationsUrl] }))
      .catch(() => undefined);
    messageEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeConversationId, conversationsUrl, messagePage?.messages.length]);

  const imageResolution = resolveProductImageForProduct(product);

  return (
    <section id="product-conversation" className="mt-8 overflow-hidden rounded-3xl border-2 border-border/80 bg-card shadow-lg" aria-labelledby="product-conversation-heading" data-testid="product-conversation">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/30 px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 id="product-conversation-heading" className="text-xl font-black text-foreground sm:text-2xl">Conversation with farmer</h2>
          </div>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">Ask about availability, harvest, quantity, collection or delivery before ordering.</p>
        </div>
        <Badge variant="outline" className="gap-1.5 rounded-full border-emerald-300 px-3 py-1 font-black text-emerald-700 dark:text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Keep payments in AgriConnect</Badge>
      </header>

      {!isAuthenticated ? (
        <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
          <MessageSquare className="h-10 w-10 text-primary" />
          <h3 className="mt-4 text-xl font-black text-foreground">Sign in to message {product.farmerName}</h3>
          <p className="mt-2 max-w-md text-sm font-semibold text-muted-foreground">Your conversation will stay attached to this product so both sides have the correct context.</p>
          <Button className="mt-5 font-black" onClick={() => { window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`; }}>Sign in to continue</Button>
        </div>
      ) : (
        <div className="grid min-h-[440px] xl:grid-cols-[230px_minmax(0,1fr)_260px]">
          <aside className="border-b border-border/70 bg-muted/20 p-4 xl:border-b-0 xl:border-r" aria-label="Product conversations">
            <p className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">{isSeller ? "Buyer enquiries" : "Your enquiry"}</p>
            {conversationsLoading ? <p className="text-sm font-semibold text-muted-foreground">Loading conversations…</p> : conversationsError ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm font-semibold text-destructive">Messaging is temporarily unavailable. Refresh the page and try again.</div>
            ) : conversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm font-semibold text-muted-foreground">
                {isSeller ? "No buyer enquiries for this product yet." : "Send your first question to start this product conversation."}
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto xl:flex-col xl:overflow-visible">
                {conversations.map((conversation) => (
                  <button key={conversation.id} onClick={() => { setActiveConversationId(conversation.id); setPage(1); }} className={`min-w-52 rounded-2xl border p-3 text-left transition-colors xl:min-w-0 ${conversation.id === activeConversationId ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/40"}`}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8"><AvatarImage src={conversation.counterpart.avatar} /><AvatarFallback>{conversation.counterpart.name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-foreground">{conversation.counterpart.name}</p><p className="text-[10px] font-semibold text-muted-foreground">{timeLabel(conversation.lastMessageAt)}</p></div>
                      {conversation.unreadCount > 0 && <Badge className="h-5 min-w-5 justify-center rounded-full p-1 text-[10px]">{conversation.unreadCount}</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <div className="flex min-w-0 flex-col">
            <div className="flex min-h-[280px] flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5" aria-live="polite">
              {!activeConversation ? (
                <div className="m-auto max-w-md text-center"><MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" /><p className="mt-3 font-black text-foreground">{isSeller ? "Select a buyer enquiry" : "Start with a useful product question"}</p><p className="mt-1 text-sm font-semibold text-muted-foreground">Messages are visible only to the buyer and this product’s registered farmer.</p></div>
              ) : messagesLoading ? <p className="m-auto text-sm font-semibold text-muted-foreground">Loading messages…</p> : messagePage?.messages.length ? messagePage.messages.map((message) => {
                const mine = message.senderId === user?.id;
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-muted/60 text-foreground"}`}>
                      <p className="mb-1 text-[10px] font-black opacity-75">{mine ? "You" : message.senderName}</p>
                      <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed">{message.content}</p>
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}><span>{timeLabel(message.createdAt)}</span>{mine && <CheckCheck className={`h-3 w-3 ${message.readAt ? "text-sky-200" : ""}`} />}</div>
                    </div>
                  </div>
                );
              }) : <p className="m-auto text-sm font-semibold text-muted-foreground">No messages yet.</p>}
              <div ref={messageEndRef} />
            </div>

            {messagePage && messagePage.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 border-t px-4 py-2 text-xs font-bold"><Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ArrowLeft className="mr-1 h-3.5 w-3.5" />Newer</Button><span>{page} / {messagePage.totalPages}</span><Button size="sm" variant="ghost" disabled={page >= messagePage.totalPages} onClick={() => setPage((value) => value + 1)}>Older<ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></div>
            )}

            <div className="border-t border-border/70 p-4">
              {!isSeller && <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{QUICK_QUESTIONS.map((question) => <button key={question} onClick={() => setDraft(question)} className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary hover:bg-primary/5">{question}</button>)}</div>}
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1"><Textarea id="product-conversation-message" value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 2000))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitMessage(); } }} disabled={isSeller && !activeConversation} placeholder={isSeller ? "Reply to this buyer…" : `Ask ${product.farmerName} about ${product.name}…`} rows={2} className="min-h-12 resize-none rounded-xl border-2 text-sm font-semibold" data-testid="input-product-conversation" /><p className="mt-1 text-right text-[10px] font-semibold text-muted-foreground">{draft.length}/2000</p></div>
                <Button onClick={() => void submitMessage()} disabled={!draft.trim() || sendMessage.isPending || createConversation.isPending || (isSeller && !activeConversation)} className="mb-4 h-12 w-12 rounded-xl p-0" aria-label="Send message" data-testid="button-send-product-message"><Send className="h-5 w-5" /></Button>
              </div>
            </div>
          </div>

          <aside className="border-t border-border/70 bg-muted/20 p-4 xl:border-l xl:border-t-0" aria-label="Conversation context">
            <p className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">Product context</p>
            <div className="overflow-hidden rounded-2xl border border-border bg-background"><div className="aspect-[4/3] overflow-hidden bg-muted"><SafeProductImage src={imageResolution.src} fallbackSrc={imageResolution.fallbackSrc} alt={product.name} className="h-full w-full object-cover" /></div><div className="p-3"><p className="font-black text-foreground">{product.name}</p><p className="mt-1 text-sm font-black text-primary">{format(product.price, { sourceCurrency: product.currency || "GBP" })}/{product.unit}</p><p className="mt-2 text-xs font-semibold text-muted-foreground">{product.stock} {product.unit} currently listed</p></div></div>
            <div className="mt-4 rounded-2xl border border-border bg-background p-3"><div className="flex items-center gap-2"><Avatar className="h-10 w-10"><AvatarImage src={product.farmerAvatar} /><AvatarFallback>{product.farmerName.charAt(0)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-black">{product.farmerName}</p><p className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" />Registered farmer</p></div></div><p className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{product.farmerLocation}</p><p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Replies appear here when the farmer responds.</p></div>
            <div className="mt-4 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Never share passwords, OTPs or card details. Complete payments only through AgriConnect checkout.</div>
          </aside>
        </div>
      )}
    </section>
  );
}
