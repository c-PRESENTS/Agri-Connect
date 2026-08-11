import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { TopNavigation } from "@/components/top-navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { LifeBuoy, Mail, MessageCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { encryptSupportMessage, type E2eSupportRecipient } from "@/lib/e2e-support";

export default function SupportPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const search = useSearch();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "other",
    message: "",
  });

  const TOPICS = [
    { value: "order", label: t("support.topic_order") },
    { value: "payment", label: t("support.topic_payment") },
    { value: "delivery", label: t("support.topic_delivery") },
    { value: "account", label: t("support.topic_account") },
    { value: "seller", label: t("support.topic_seller") },
    { value: "feedback", label: t("support.topic_feedback") },
    { value: "other", label: t("support.topic_other") },
  ];

  // Pre-fill the form when the user arrives from an order detail page.
  useEffect(() => {
    const params = new URLSearchParams(search);
    const orderId = params.get("orderId");
    const orderNumber = params.get("orderNumber");
    if (orderId || orderNumber) {
      setForm((f) => ({
        ...f,
        topic: "order",
        message: f.message
          ? f.message
          : `Hi, I'd like help with my order ${orderNumber || orderId}.\n\n`,
      }));
    }
  }, [search]);

  const submit = useMutation({
    mutationFn: async () => {
      const recipient = await (await apiRequest("GET", "/api/e2e/support-key")).json() as E2eSupportRecipient;
      const contact = {
        name: form.name || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "",
        email: form.email || user?.email || "",
      };
      const encryptedMessage = recipient.enabled ? await encryptSupportMessage(form.message, recipient) : undefined;
      const res = await apiRequest("POST", "/api/support", {
        ...form,
        ...contact,
        ...(encryptedMessage ? { message: undefined, encryptedMessage } : {}),
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: t("support.message_received"),
        description: t("support.message_received_desc"),
      });
    },
    onError: (err: Error) => {
      toast({ title: t("support.could_not_send"), description: err.message, variant: "destructive" });
    },
  });

  const canSubmit =
    form.message.trim().length >= 10 &&
    (!!user?.email || /\S+@\S+\.\S+/.test(form.email)) &&
    !submit.isPending;

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <div className="max-w-4xl mx-auto p-5 sm:p-10 space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center shrink-0">
            <LifeBuoy className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight" data-testid="text-support-heading">
              {t("support.title")}
            </h1>
            <p className="text-base sm:text-lg font-bold text-foreground/80 mt-1">
              {t("support.subtitle")}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="border-2 border-border/80 rounded-2xl shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="p-3 rounded-xl bg-amber-400/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-black text-foreground">{t("support.email_us")}</p>
                <a
                  href="mailto:support@agriconnect.app"
                  className="text-base font-black text-amber-600 dark:text-amber-400 underline decoration-2 hover:text-amber-700"
                  data-testid="link-support-email"
                >
                  support@agriconnect.app
                </a>
                <p className="text-sm font-bold text-muted-foreground mt-1">{t("support.replies_within")}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-border/80 rounded-2xl shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="p-3 rounded-xl bg-amber-400/10 text-amber-600 dark:text-amber-400 shrink-0">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-black text-foreground">{t("support.knowledge_hub")}</p>
                <Link
                  href="/farmers-help"
                  className="text-base font-black text-amber-600 dark:text-amber-400 underline decoration-2 hover:text-amber-700"
                  data-testid="link-knowledge-hub"
                >
                  {t("support.browse_articles")}
                </Link>
                <p className="text-sm font-bold text-muted-foreground mt-1">{t("support.self_serve")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 border-border/80 rounded-3xl shadow-xl p-2 sm:p-4">
          <CardHeader className="p-6 sm:p-8">
            <CardTitle className="text-2xl sm:text-3xl font-black text-foreground">{t("support.send_message")}</CardTitle>
            <CardDescription className="text-base font-bold text-muted-foreground mt-1">
              {t("support.send_message_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8 sm:px-8">
            {submitted ? (
              <div className="text-center py-12" data-testid="text-support-thanks">
                <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
                <h2 className="text-2xl font-black mb-2 text-foreground">{t("support.thank_you")}</h2>
                <p className="text-base font-bold text-muted-foreground mb-6 max-w-md mx-auto">
                  {t("support.thank_you_desc", { email: user?.email || form.email })}
                </p>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 text-base font-black border-2 rounded-xl"
                  onClick={() => {
                    setSubmitted(false);
                    setForm({ name: "", email: "", topic: "other", message: "" });
                  }}
                  data-testid="button-send-another"
                >
                  {t("support.send_another")}
                </Button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); if (canSubmit) submit.mutate(); }}>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="s-name" className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground mb-2 block">{t("support.your_name")}</Label>
                    <Input
                      id="s-name"
                      className="h-13 text-base sm:text-lg font-bold rounded-xl border-2 px-4"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder={user?.name || user?.firstName || "Full name"}
                      data-testid="input-support-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="s-email" className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground mb-2 block">{t("support.email")}{user?.email ? "" : <span className="text-rose-500"> *</span>}</Label>
                    <Input
                      id="s-email"
                      type="email"
                      className="h-13 text-base sm:text-lg font-bold rounded-xl border-2 px-4"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder={user?.email || "you@example.com"}
                      data-testid="input-support-email"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="s-topic" className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground mb-2 block">{t("support.topic")}</Label>
                  <Select
                    value={form.topic}
                    onValueChange={(v) => setForm((f) => ({ ...f, topic: v }))}
                  >
                    <SelectTrigger id="s-topic" className="h-13 text-base sm:text-lg font-bold rounded-xl border-2 px-4" data-testid="select-support-topic">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOPICS.map((topic) => (
                        <SelectItem key={topic.value} value={topic.value} className="text-base font-bold py-2.5">
                          {topic.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="s-message" className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground mb-2 block">
                    {t("support.message")} <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="s-message"
                    rows={6}
                    className="text-base sm:text-lg font-bold rounded-xl border-2 p-4 min-h-[160px]"
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder={t("support.message_placeholder")}
                    data-testid="input-support-message"
                  />
                  <p className="text-sm font-bold text-muted-foreground mt-2">
                    {t("support.char_count", { count: form.message.trim().length })}
                  </p>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!canSubmit}
                    className="h-13 px-8 text-base font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-lg rounded-xl"
                    data-testid="button-send-support"
                  >
                    {submit.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    {t("support.send_button")}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
