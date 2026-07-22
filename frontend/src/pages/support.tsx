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
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <LifeBuoy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-support-heading">
              {t("support.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("support.subtitle")}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-6 flex gap-3 items-start">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t("support.email_us")}</p>
                <a
                  href="mailto:support@agriconnect.app"
                  className="text-sm text-primary underline"
                  data-testid="link-support-email"
                >
                  support@agriconnect.app
                </a>
                <p className="text-xs text-muted-foreground mt-1">{t("support.replies_within")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex gap-3 items-start">
              <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t("support.knowledge_hub")}</p>
                <Link
                  href="/farmers-help"
                  className="text-sm text-primary underline"
                  data-testid="link-knowledge-hub"
                >
                  {t("support.browse_articles")}
                </Link>
                <p className="text-xs text-muted-foreground mt-1">{t("support.self_serve")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("support.send_message")}</CardTitle>
            <CardDescription>
              {t("support.send_message_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-10" data-testid="text-support-thanks">
                <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-1">{t("support.thank_you")}</h2>
                <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
                  {t("support.thank_you_desc", { email: user?.email || form.email })}
                </p>
                <Button
                  variant="outline"
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
              <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (canSubmit) submit.mutate(); }}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="s-name">{t("support.your_name")}</Label>
                    <Input
                      id="s-name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder={user?.name || user?.firstName || "Full name"}
                      data-testid="input-support-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="s-email">{t("support.email")}{user?.email ? "" : <span className="text-rose-500"> *</span>}</Label>
                    <Input
                      id="s-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder={user?.email || "you@example.com"}
                      data-testid="input-support-email"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="s-topic">{t("support.topic")}</Label>
                  <Select
                    value={form.topic}
                    onValueChange={(v) => setForm((f) => ({ ...f, topic: v }))}
                  >
                    <SelectTrigger id="s-topic" data-testid="select-support-topic">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOPICS.map((topic) => (
                        <SelectItem key={topic.value} value={topic.value}>
                          {topic.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="s-message">
                    {t("support.message")} <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="s-message"
                    rows={6}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder={t("support.message_placeholder")}
                    data-testid="input-support-message"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("support.char_count", { count: form.message.trim().length })}
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    data-testid="button-send-support"
                  >
                    {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
