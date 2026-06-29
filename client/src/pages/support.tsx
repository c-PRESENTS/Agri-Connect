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

const TOPICS = [
  { value: "order", label: "Order issue" },
  { value: "payment", label: "Payment problem" },
  { value: "delivery", label: "Delivery question" },
  { value: "account", label: "Account / login" },
  { value: "seller", label: "Seller onboarding" },
  { value: "feedback", label: "Feedback or feature request" },
  { value: "other", label: "Something else" },
];

export default function SupportPage() {
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
      const res = await apiRequest("POST", "/api/support", {
        ...form,
        name: form.name || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "",
        email: form.email || user?.email || "",
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Message received",
        description: "Our support team will reply within one business day.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Could not send", description: err.message, variant: "destructive" });
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
              Customer support
            </h1>
            <p className="text-sm text-muted-foreground">
              We&apos;re here to help with orders, payments, deliveries and your account.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-6 flex gap-3 items-start">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Email us</p>
                <a
                  href="mailto:support@agriconnect.app"
                  className="text-sm text-primary underline"
                  data-testid="link-support-email"
                >
                  support@agriconnect.app
                </a>
                <p className="text-xs text-muted-foreground mt-1">Replies within 1 business day</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex gap-3 items-start">
              <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Knowledge Hub</p>
                <Link
                  href="/farmers-help"
                  className="text-sm text-primary underline"
                  data-testid="link-knowledge-hub"
                >
                  Browse articles & guides
                </Link>
                <p className="text-xs text-muted-foreground mt-1">Self-serve answers in seconds</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
            <CardDescription>
              Tell us what&apos;s happening. The more detail you give, the faster we can help.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-10" data-testid="text-support-thanks">
                <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-1">Thank you — message received</h2>
                <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
                  Our support team will respond to{" "}
                  <span className="font-medium">{user?.email || form.email}</span> within one
                  business day.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setForm({ name: "", email: "", topic: "other", message: "" });
                  }}
                  data-testid="button-send-another"
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="s-name">Your name</Label>
                    <Input
                      id="s-name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder={user?.name || user?.firstName || "Full name"}
                      data-testid="input-support-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="s-email">Email{user?.email ? "" : <span className="text-rose-500"> *</span>}</Label>
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
                  <Label htmlFor="s-topic">Topic</Label>
                  <Select
                    value={form.topic}
                    onValueChange={(v) => setForm((f) => ({ ...f, topic: v }))}
                  >
                    <SelectTrigger id="s-topic" data-testid="select-support-topic">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOPICS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="s-message">
                    Message <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="s-message"
                    rows={6}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="Describe the issue or question. Include order numbers if relevant."
                    data-testid="input-support-message"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum 10 characters. Currently {form.message.trim().length}.
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => submit.mutate()}
                    disabled={!canSubmit}
                    data-testid="button-send-support"
                  >
                    {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send message
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
