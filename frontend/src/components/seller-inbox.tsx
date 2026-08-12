import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Package } from "lucide-react";
import type { MarketplaceConversationSummary } from "@shared/schema";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SellerInbox() {
  const [, navigate] = useLocation();
  const { data = [], isLoading, isError } = useQuery<MarketplaceConversationSummary[]>({ queryKey: ["/api/conversations"] });
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const conversations = filter === "unread" ? data.filter((item) => item.unreadCount > 0) : data;
  return <section className="space-y-4" data-testid="seller-inbox"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Buyer messages</h2><p className="text-sm text-muted-foreground">Product-linked conversations with marketplace buyers.</p></div><div className="flex rounded-lg border p-1"><Button size="sm" variant={filter === "all" ? "default" : "ghost"} onClick={() => setFilter("all")}>All</Button><Button size="sm" variant={filter === "unread" ? "default" : "ghost"} onClick={() => setFilter("unread")}>Unread</Button></div></div>
    {isLoading ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading messages…</CardContent></Card> : isError ? <Card><CardContent className="p-8 text-center text-sm text-destructive">Unable to load seller messages.</CardContent></Card> : !conversations.length ? <Card><CardContent className="py-14 text-center"><MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-3 font-black">{filter === "unread" ? "No unread messages" : "No buyer enquiries yet"}</h3><p className="mt-1 text-sm text-muted-foreground">Buyer questions linked to your products will appear here.</p></CardContent></Card> : <div className="space-y-2">{conversations.map((conversation) => <button key={conversation.id} onClick={() => navigate(`/products/${conversation.product.id}#product-conversation`)} className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left hover:border-primary/50 hover:bg-muted/30"><Avatar><AvatarImage src={conversation.counterpart.avatar} /><AvatarFallback>{conversation.counterpart.name.charAt(0)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate font-black">{conversation.counterpart.name}</p><p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><Package className="h-3 w-3" />{conversation.product.name}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">{new Date(conversation.lastMessageAt).toLocaleDateString()}</p>{conversation.unreadCount > 0 && <Badge className="mt-1">{conversation.unreadCount} unread</Badge>}</div></button>)}</div>}
  </section>;
}
