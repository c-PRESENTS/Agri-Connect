import { useCallback, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CreditCard,
  Loader2,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { TopNavigation } from "@/components/top-navigation";
import { useToast } from "@/hooks/use-toast";
import {
  createCashOrder,
  createCheckoutIntent,
  followCheckoutNextAction,
  getCheckoutMethods,
  getCheckoutQuote,
  type CheckoutMethodResponse,
  type PaymentClientError,
} from "@/lib/payment-client";
import { useCurrency } from "@/contexts/currency-context";
import { queryClient } from "@/lib/queryClient";
import { CheckoutProgress } from "@/components/checkout-progress";
import { SafeProductImage } from "@/components/safe-product-image";
import { resolveProductImageForOrderItem } from "@/lib/product-images";
import { TurnstileWidget } from "@/components/turnstile-widget";

type FunctionalMethod = "stripe" | "cash" | "razorpay" | "paypal";
type OnlineMethod = Exclude<FunctionalMethod, "cash">;

const reasonMessages: Record<string, string> = {
  provider_not_enabled: "Card payments are currently unavailable.",
  provider_not_activated: "Card payment setup is not complete.",
  provider_webhook_unverified: "Card payment verification is not complete.",
  razorpay_inr_only: "Razorpay is available for INR checkout only.",
  razorpay_unavailable: "Razorpay test checkout is not configured.",
  razorpay_test_credentials_missing: "Razorpay test credentials are not configured.",
  razorpay_webhook_secret_missing: "Razorpay webhook verification is not configured.",
  paypal_test_credentials_missing: "PayPal sandbox credentials are not configured.",
  seller_marketplace_verification_required: "Seller verification is required for live payments.",
  cash_gbp_only: "Cash checkout is available for GBP orders only.",
  seller_payment_account_ineligible:
    "One or more farmers cannot currently accept online payments.",
  stripe_platform_responsibilities_unverified:
    "Card payments are currently unavailable.",
  seller_cash_pickup_unavailable:
    "One or more farmers do not accept cash at pickup.",
  seller_cash_delivery_unavailable:
    "One or more farmers do not accept cash on farmer delivery.",
  carrier_requires_prepayment: "Carrier delivery requires online prepayment.",
  fulfillment_selection_required: "Choose fulfilment for every farmer first.",
  coming_soon: "Currently unavailable",
};

function MethodRow({
  method,
  selected,
  icon: Icon,
  title,
  subtitle,
  badge,
}: {
  method?: CheckoutMethodResponse;
  selected: boolean;
  icon: typeof CreditCard;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  const available = method?.available === true;
  const message = method?.reasonCode ? reasonMessages[method.reasonCode] : undefined;
  return (
    <label
      className={`flex min-h-24 gap-4 rounded-2xl border-2 p-5 transition-all sm:min-h-28 sm:p-6 ${
        available
          ? selected
            ? "cursor-pointer border-primary bg-primary/5 shadow-sm"
            : "cursor-pointer border-border hover:border-primary/50 hover:bg-muted/20"
          : "cursor-not-allowed border-border bg-muted/30 opacity-70"
      }`}
      aria-disabled={!available}
    >
      <RadioGroupItem value={method?.id ?? title} disabled={!available} className="mt-1" />
      <Icon className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-base font-bold">{title}</span>
          {(badge || method?.displayStatus === "coming_soon") && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {badge ?? "Coming soon"}
            </span>
          )}
        </span>
        <span className="mt-1.5 block text-sm leading-6 text-muted-foreground sm:text-base">
          {subtitle}
        </span>
        {!available && message && method?.displayStatus !== "coming_soon" && (
          <span className="mt-2 block text-xs text-destructive">{message}</span>
        )}
      </span>
    </label>
  );
}

export default function CheckoutPaymentPage() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { currency, format } = useCurrency();
  const [selectedMethod, setSelectedMethod] = useState<FunctionalMethod | "">("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const handleCaptchaToken = useCallback((token: string) => setCaptchaToken(token), []);
  const onlineKeys = useRef<Record<OnlineMethod, string>>({
    stripe: crypto.randomUUID(),
    razorpay: crypto.randomUUID(),
    paypal: crypto.randomUUID(),
  });
  const cashKey = useRef(crypto.randomUUID());

  const quoteQuery = useQuery({
    queryKey: ["/api/checkout/quotes", quoteId],
    queryFn: () => getCheckoutQuote(quoteId),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const methodsQuery = useQuery({
    queryKey: ["/api/payments/methods", quoteId],
    queryFn: () => getCheckoutMethods(quoteId),
    enabled: Boolean(quoteQuery.data),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const configQuery = useQuery<{ turnstileSiteKey?: string }>({
    queryKey: ["/api/config"],
    retry: false,
  });
  const methods = new Map(
    (methodsQuery.data?.methods ?? []).map((method) => [method.id, method]),
  );

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (selectedMethod && selectedMethod !== "cash") {
        const selectedOnlineMethod = selectedMethod as OnlineMethod;
        const provider =
          methods.get(selectedOnlineMethod)?.flow === "mock"
            ? "mock"
            : selectedOnlineMethod;
        const result = await createCheckoutIntent(
          quoteId,
          onlineKeys.current[selectedOnlineMethod],
          provider,
          captchaToken,
          provider === "mock"
            ? selectedOnlineMethod === "stripe"
              ? "card"
              : selectedOnlineMethod
            : undefined,
        );
        const outcome = await followCheckoutNextAction(result.nextAction);
        if (outcome !== "navigated") {
          navigate(`/payment/${result.attemptId}/processing`, {
            replace: true,
          });
        }
        return;
      }
      if (selectedMethod === "cash") {
        const result = await createCashOrder(quoteId, cashKey.current, captchaToken);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/cart"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] }),
        ]);
        queryClient.removeQueries({ queryKey: ["/api/checkout/quotes"] });
        queryClient.removeQueries({ queryKey: ["/api/payments/methods"] });
        navigate(`/order-confirmation/${result.orderId}`, { replace: true });
        return;
      }
      throw new Error("Choose a payment method");
    },
    onError: (error: PaymentClientError) => {
      // Turnstile tokens are single-use. The server may have consumed the
      // token before a database or provider error was returned, so every
      // failed submission must request a fresh verification before retrying.
      setCaptchaToken("");
      setCaptchaResetKey((current) => current + 1);
      if (error.code === "quote_consumed" && error.orderId) {
        queryClient.removeQueries({ queryKey: ["/api/checkout/quotes"] });
        queryClient.removeQueries({ queryKey: ["/api/payments/methods"] });
        navigate(`/order-confirmation/${error.orderId}`, { replace: true });
        return;
      }
      if (error.code === "quote_required") {
        toast({
          title: "Checkout needs updating",
          description:
            "Your cart changed after this quote was created. Review it and create a fresh payment quote.",
        });
        navigate("/checkout", { replace: true });
        return;
      }
      toast({
        title: "Could not continue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (quoteQuery.isLoading || methodsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="flex justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!quoteQuery.data || quoteQuery.isError || methodsQuery.isError) {
    const quoteError = quoteQuery.error as PaymentClientError | null;
    const completedOrderId =
      quoteError?.code === "quote_consumed" ? quoteError.orderId : undefined;
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <main className="mx-auto max-w-lg px-4 py-16">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
              <h1 className="text-xl font-bold">
                {completedOrderId
                  ? "Checkout already completed"
                  : "Payment quote unavailable"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {completedOrderId
                  ? "This quote has already created an order and cannot be charged again."
                  : "The quote may have expired or the cart may have changed. Return to checkout for a fresh total."}
              </p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                {completedOrderId && (
                  <Button
                    onClick={() =>
                      navigate(`/order-confirmation/${completedOrderId}`, {
                        replace: true,
                      })
                    }
                  >
                    View completed order
                  </Button>
                )}
                <Button
                  variant={completedOrderId ? "outline" : "default"}
                  onClick={() => navigate("/checkout", { replace: true })}
                >
                  Return to checkout
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const quote = quoteQuery.data;
  const money = (amountMinor: string) =>
    format(Number(amountMinor) / 100, {
      sourceCurrency: quote.currency,
      includeCode: true,
    });
  const cashSelected = selectedMethod === "cash";
  const selectedOnlineMethod =
    selectedMethod && selectedMethod !== "cash" ? selectedMethod : undefined;
  const turnstileSiteKey = configQuery.data?.turnstileSiteKey?.trim() || "";
  const fulfilmentEntries = Array.from(
    new Map(
      quote.items.map((item) => [
        item.farmerId,
        {
          farmerId: item.farmerId,
          farmerName: item.farmerName,
          choice: quote.shippingChoices[item.farmerId],
        },
      ]),
    ).values(),
  );

  const fulfilmentLabel = (partnerId?: string) => {
    if (partnerId === "buyer-collection") return "Collect from farmer";
    if (partnerId === "farmer-delivery") return "Farmer door delivery";
    return "Carrier door delivery";
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
        <button
          type="button"
          onClick={() => navigate("/checkout")}
          className="mb-6 flex items-center gap-2 text-sm sm:text-base font-black uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5 stroke-[2.5]" /> Back to delivery
        </button>

        <div className="mb-8 rounded-3xl border-2 border-border/80 bg-card px-4 py-6 shadow-md sm:px-8">
          <CheckoutProgress currentStep={3} />
        </div>

        <div className="mb-8 border-b border-border/60 pb-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            Secure payment
          </h1>
          <p className="mt-2 text-base sm:text-lg font-bold text-foreground/85">
            Choose how you want to pay.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <Card className="rounded-3xl border-2 border-border/80 shadow-md p-2">
              <CardContent className="p-6 sm:p-8">
                <RadioGroup
                  value={selectedMethod}
                  onValueChange={(method) =>
                    setSelectedMethod(method as FunctionalMethod)
                  }
                  className="space-y-5"
                >
                  <MethodRow
                    method={methods.get("stripe")}
                    selected={selectedMethod === "stripe"}
                    icon={CreditCard}
                    title="Credit or debit card"
                    subtitle="Visa · Mastercard · American Express"
                  />
                  <MethodRow
                    method={methods.get("cash")}
                    selected={selectedMethod === "cash"}
                    icon={Banknote}
                    title="Pay in cash"
                    subtitle="Pay each farmer when collecting or receiving their part of the order."
                  />
                  <MethodRow
                    method={methods.get("razorpay")}
                    selected={selectedMethod === "razorpay"}
                    icon={Smartphone}
                    title="Razorpay"
                    subtitle="UPI · Net Banking · Wallets · EMI"
                  />
                  <MethodRow
                    method={methods.get("paypal")}
                    selected={selectedMethod === "paypal"}
                    icon={WalletCards}
                    title="PayPal"
                    subtitle="Pay securely using your PayPal account."
                  />
                </RadioGroup>

                {cashSelected && (
                  <div className="mt-6 flex gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm sm:text-base font-bold text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    Cash orders are not protected by Stripe and do not support automatic online refunds.
                  </div>
                )}
                <div className="mt-6 space-y-4 rounded-2xl border-2 border-border/70 bg-muted/10 p-5">
                  <div>
                    <h2 className="text-lg font-black text-foreground">Final order review</h2>
                    <p className="mt-1 text-sm font-bold text-muted-foreground">
                      Confirm the address, fulfilment, total, and payment method before placing the order.
                    </p>
                  </div>
                  {quote.deliveryAddressStruct && (
                    <div className="rounded-xl border bg-background p-4">
                      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Delivery address</p>
                      <p className="mt-1 font-black text-foreground">{quote.deliveryAddressStruct.name}</p>
                      <p className="mt-1 text-sm font-bold text-foreground/80">
                        {[
                          quote.deliveryAddressStruct.line1,
                          quote.deliveryAddressStruct.line2,
                          quote.deliveryAddressStruct.city,
                          quote.deliveryAddressStruct.county,
                          quote.deliveryAddressStruct.postcode,
                          quote.deliveryAddressStruct.country,
                        ].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2 rounded-xl border bg-background p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Seller fulfilment</p>
                    {fulfilmentEntries.map((entry) => (
                      <div key={entry.farmerId} className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-black text-foreground">{entry.farmerName}</span>
                        <span className="text-right font-bold text-muted-foreground">
                          {fulfilmentLabel(entry.choice?.partnerId)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {turnstileSiteKey ? (
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      resetKey={captchaResetKey}
                      onTokenChange={handleCaptchaToken}
                    />
                  ) : (
                    <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 text-sm font-bold text-destructive">
                      Secure checkout verification is not configured. Add the Turnstile site key before accepting orders.
                    </div>
                  )}
                </div>
                <Button
                  className="mt-8 h-14 sm:h-16 w-full text-base sm:text-lg font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-lg transition-transform hover:scale-[1.01]"
                  size="lg"
                  disabled={!selectedMethod || !captchaToken || !turnstileSiteKey || paymentMutation.isPending}
                  onClick={() => paymentMutation.mutate()}
                >
                  {paymentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {selectedMethod === "cash"
                        ? "Placing order…"
                        : "Processing payment…"}
                    </>
                  ) : selectedMethod === "cash" ? (
                    "Place cash order"
                  ) : selectedOnlineMethod ? (
                    selectedOnlineMethod === "stripe"
                      ? "Pay securely"
                      : selectedOnlineMethod === "razorpay"
                        ? "Continue with Razorpay"
                        : "Continue with PayPal"
                  ) : (
                    "Choose a payment method"
                  )}
                </Button>
              </CardContent>
            </Card>
          </section>

          <aside className="min-w-0">
            <Card className="rounded-3xl border-2 border-border/80 shadow-md lg:sticky lg:top-6 p-2">
              <CardContent className="p-6 space-y-5">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-foreground">Order summary</h2>
                <p className="text-xs sm:text-sm font-bold text-muted-foreground">
                  Quote expires {new Date(quote.expiresAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
                  {quote.items.map((item) => {
                    const imageResolution = resolveProductImageForOrderItem({
                      productId: item.productId,
                      productName: item.name,
                      productImage: item.image,
                    });
                    return (
                    <div key={item.productId} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30 border">
                      <SafeProductImage
                        src={imageResolution.src}
                        fallbackSrc={imageResolution.fallbackSrc}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-xl object-cover border"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-foreground">{item.name}</p>
                        <p className="text-xs font-bold text-muted-foreground">
                          Qty {item.quantity} · {item.farmerName}
                        </p>
                      </div>
                      <span className="text-sm font-black text-foreground">
                        {format(item.unitPrice * item.quantity, { includeCode: true })}
                      </span>
                    </div>
                    );
                  })}
                </div>
                <Separator className="my-4 h-0.5" />
                <div className="space-y-3 text-base">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-muted-foreground">Subtotal</span>
                    <span className="font-black text-foreground">{money(quote.subtotalMinor)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-muted-foreground">Delivery</span>
                    <span className="font-black text-foreground">{money(quote.shippingMinor)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="font-bold text-muted-foreground">Taxes</span>
                    <span className="text-right text-xs font-bold text-muted-foreground">Included where applicable</span>
                  </div>
                  {Number(quote.platformFeeMinor) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-muted-foreground">Platform fee</span>
                      <span className="font-black text-foreground">{money(quote.platformFeeMinor)}</span>
                    </div>
                  )}
                  <Separator className="my-2 h-0.5" />
                  <div className="flex justify-between items-center">
                    <span className="font-black text-lg sm:text-xl uppercase tracking-wider text-foreground">Total</span>
                    <span className="font-black text-2xl text-primary">{money(quote.totalMinor)}</span>
                  </div>
                </div>
                {currency !== quote.currency && (
                  <div className="mt-4 rounded-xl border-2 border-amber-300/80 bg-amber-50 p-4 text-xs sm:text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                    <p className="font-black text-sm sm:text-base">Estimated {money(quote.totalMinor)}</p>
                    <p className="mt-1 font-bold">
                      You will be charged{" "}
                      {new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: quote.currency,
                        currencyDisplay: "code",
                      }).format(Number(quote.totalMinor) / 100)}.
                    </p>
                  </div>
                )}
                <div className="mt-4 flex gap-3 rounded-xl bg-muted/60 p-4 text-xs sm:text-sm font-bold text-foreground/80 border">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  Online orders are confirmed only after server verification.
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
