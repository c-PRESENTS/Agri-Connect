import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Truck, CreditCard, CheckCircle, ChevronRight, ChevronLeft,
  Package, Shield, Clock, ArrowLeft, Loader2, Star, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Cart, ShipQuote, ShipServiceType } from "@shared/schema";
import { COUNTRIES } from "@/lib/countries";
import { TopNavigation } from "@/components/top-navigation";
import { getProductImage } from "@/lib/product-images";

interface CartShippingGroup {
  farmerId: string;
  farmerName: string;
  farmerLocation: string;
  locationEstimated?: boolean;
  itemCount: number;
  weightKg: number;
  distanceKm: number;
  quotes: ShipQuote[];
}
interface CartShippingResponse {
  groups: CartShippingGroup[];
  totalCheapest: number;
  currency: string;
}

const STEPS = [
  { id: 1, label: "checkout.step_delivery", icon: MapPin },
  { id: 2, label: "checkout.step_shipping", icon: Truck },
  { id: 3, label: "checkout.step_payment", icon: CreditCard },
  { id: 4, label: "checkout.step_review", icon: CheckCircle },
];


export default function CheckoutPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({
    fullName: user?.name || "",
    line1: "",
    line2: "",
    city: "",
    county: "",
    postcode: "",
    country: "GB",
    phone: "",
    email: user?.email || "",
  });
  const [shippingGroups, setShippingGroups] = useState<CartShippingGroup[] | null>(null);
  // farmerId -> { partnerId, service }
  const [shippingChoices, setShippingChoices] = useState<Record<string, { partnerId: string; service: ShipServiceType }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: cart, isLoading: isCartLoading, isError: isCartError, refetch: refetchCart } = useQuery<Cart>({
    queryKey: ["/api/cart"],
  });

  const subtotal = cart?.total || 0;
  // Sum of buyer's per-farmer shipping selections
  const shippingTotal = shippingGroups
    ? shippingGroups.reduce((sum, group) => {
        const choice = shippingChoices[group.farmerId];
        const quote = choice ? group.quotes.find((item) => item.partnerId === choice.partnerId && item.service === choice.service) : group.quotes[0];
        return sum + (quote?.price ?? 0);
      }, 0)
    : 0;
  const tax = parseFloat((subtotal * 0.2).toFixed(2));
  const total = parseFloat((subtotal + shippingTotal + tax).toFixed(2));

  const cartQuotesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cart/shipping-quotes", {
        drop: {
          name: address.fullName,
          phone: address.phone || "0000000000",
          email: address.email || undefined,
          line1: address.line1,
          line2: address.line2 || undefined,
          city: address.city,
          county: address.county || undefined,
          postcode: address.postcode,
          country: address.country,
        },
      });
      return (await res.json()) as CartShippingResponse;
    },
    onSuccess: (data) => {
      setShippingGroups(data.groups);
      // Auto-select cheapest per group
      const next: typeof shippingChoices = {};
      for (const g of data.groups) {
        const cheapest = g.quotes[0];
        if (cheapest) next[g.farmerId] = { partnerId: cheapest.partnerId, service: cheapest.service };
      }
      setShippingChoices(next);
    },
    onError: (err: any) => {
      toast({
        title: t("checkout.shipping_title"),
        description: err?.message || t("checkout.loading_description"),
        variant: "destructive",
      });
    },
  });

  const manualOrderMutation = useMutation({
    mutationFn: async () => {
      // Pre-checkout validation: confirm every item is still in stock.
      const validateRes = await apiRequest("POST", "/api/cart/validate", {});
      const validation = (await validateRes.json()) as {
        ok: boolean;
        issues: { productName: string; reason: string; available?: number; requested: number }[];
      };
      if (!validation.ok) {
        const messages = validation.issues.map((i) => {
          if (i.reason === "out_of_stock") return `${i.productName} is out of stock`;
          if (i.reason === "insufficient_stock") return `${i.productName}: only ${i.available} available (you have ${i.requested})`;
          if (i.reason === "missing") return `${i.productName} is no longer available`;
          return `${i.productName}: unavailable`;
        });
        throw new Error(messages.join(" • "));
      }

      const deliveryAddress = `${address.fullName}, ${address.line1}${address.line2 ? ", " + address.line2 : ""}, ${address.city}, ${address.county} ${address.postcode}, ${address.country}`;

      const res = await apiRequest("POST", "/api/cart/checkout", {
        deliveryAddress,
        deliveryMethod: "standard",
        shippingChoices,
        deliveryAddressStruct: {
          name: address.fullName,
          phone: address.phone || "0000000000",
          email: address.email || undefined,
          line1: address.line1,
          line2: address.line2 || undefined,
          city: address.city,
          county: address.county || undefined,
          postcode: address.postcode,
          country: address.country,
        },
      });
      return (await res.json()) as { id: string };
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      navigate(`/order-confirmation/${order.id}`);
    },
    onError: (err: any) => {
      toast({
        title: "Could not place order",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated]);

  useEffect(() => {
    if (cart && cart.items.length === 0 && !manualOrderMutation.isSuccess) {
      navigate("/cart");
    }
  }, [cart]);

  function validateStep1() {
    const errs: Record<string, string> = {};
    if (!address.fullName.trim()) errs.fullName = t("checkout.full_name");
    if (!address.line1.trim()) errs.line1 = t("checkout.address_line1");
    if (!address.city.trim()) errs.city = t("checkout.city");
    if (!address.postcode.trim()) errs.postcode = t("checkout.postcode");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function nextStep() {
    if (step === 1) {
      if (!validateStep1()) return;
      // Trigger quote fetch as we move to step 2
      cartQuotesMutation.mutate();
    }
    if (step === 2) {
      // Block if any group is missing a selection
      if (!shippingGroups || shippingGroups.length === 0) {
        toast({ title: t("checkout.shipping_title"), variant: "destructive" });
        return;
      }
      // Groups with zero quotes can't be selected — they will be flagged for
      // manual collection downstream and must not block checkout.
      const missing = shippingGroups.filter((g) => g.quotes.length > 0 && !shippingChoices[g.farmerId]);
      if (missing.length > 0) {
        toast({
          title: t("checkout.select_carrier"),
          description: `${t("checkout.shipping_title")}: ${missing.map((m) => m.farmerName).join(", ")}`,
          variant: "destructive",
        });
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 4));
  }

  if (isCartLoading) {
    return <div className="min-h-screen bg-background"><TopNavigation /><div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></div>;
  }

  if (isCartError) {
    return <div className="min-h-screen bg-background"><TopNavigation /><div className="text-center py-20 px-4" data-testid="checkout-cart-error-state"><AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" /><h1 className="text-xl font-bold">Unable to load checkout</h1><Button variant="outline" className="mt-5" onClick={() => refetchCart()}>Try again</Button></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <button
          onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate("/cart"))}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {step > 1 ? t("common.back") : t("cart.title")}
        </button>

        <h1 className="text-xl sm:text-2xl font-black mb-4 sm:mb-6">{t("checkout.title")}</h1>

        {/* Step indicator */}
        <div className="flex items-center mb-6 sm:mb-8">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    step > s.id
                      ? "bg-primary border-primary text-primary-foreground"
                      : step === s.id
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground bg-background"
                  }`}
                >
                  {step > s.id ? (
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </div>
                <span className={`text-[9px] sm:text-[10px] font-semibold mt-1 whitespace-nowrap ${step === s.id ? "text-primary" : "text-muted-foreground"}`}>
                  {t(s.label)}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 sm:mx-2 mb-4 transition-all ${step > s.id ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Step 1: Delivery Address */}
                {step === 1 && (
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <MapPin className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-bold">{t("checkout.delivery_title")}</h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <Label htmlFor="fullName">{t("checkout.full_name")} *</Label>
                          <Input
                            id="fullName"
                            data-testid="input-fullName"
                            value={address.fullName}
                            onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                            placeholder={t("checkout.full_name_placeholder")}
                            className={errors.fullName ? "border-destructive" : ""}
                          />
                          {errors.fullName && <p className="text-[11px] text-destructive mt-1">{errors.fullName}</p>}
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor="line1">{t("checkout.address_line1")} *</Label>
                          <Input
                            id="line1"
                            data-testid="input-line1"
                            value={address.line1}
                            onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                            placeholder={t("checkout.address_line1_placeholder")}
                            className={errors.line1 ? "border-destructive" : ""}
                          />
                          {errors.line1 && <p className="text-[11px] text-destructive mt-1">{errors.line1}</p>}
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor="line2">{t("checkout.address_line2")}</Label>
                          <Input
                            id="line2"
                            value={address.line2}
                            onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                            placeholder={t("checkout.address_line2_placeholder")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="city">{t("checkout.city")} *</Label>
                          <Input
                            id="city"
                            data-testid="input-city"
                            value={address.city}
                            onChange={(e) => setAddress({ ...address, city: e.target.value })}
                            placeholder={t("checkout.city_placeholder")}
                            className={errors.city ? "border-destructive" : ""}
                          />
                          {errors.city && <p className="text-[11px] text-destructive mt-1">{errors.city}</p>}
                        </div>
                        <div>
                          <Label htmlFor="county">{t("checkout.county")}</Label>
                          <Input
                            id="county"
                            value={address.county}
                            onChange={(e) => setAddress({ ...address, county: e.target.value })}
                            placeholder={t("checkout.county_placeholder")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="postcode">{t("checkout.postcode")} *</Label>
                          <Input
                            id="postcode"
                            data-testid="input-postcode"
                            value={address.postcode}
                            onChange={(e) => setAddress({ ...address, postcode: e.target.value.toUpperCase() })}
                            placeholder={t("checkout.postcode_placeholder")}
                            className={errors.postcode ? "border-destructive" : ""}
                          />
                          {errors.postcode && <p className="text-[11px] text-destructive mt-1">{errors.postcode}</p>}
                        </div>
                        <div>
                          <Label htmlFor="country">{t("send_parcel.country")} *</Label>
                          <Select value={address.country} onValueChange={(v) => setAddress({ ...address, country: v })}>
                            <SelectTrigger id="country" data-testid="select-country">
                              <SelectValue placeholder={t("send_parcel.country")} />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRIES.map((c) => (
                                <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="phone">{t("checkout.phone")}</Label>
                          <Input
                            id="phone"
                            value={address.phone}
                            onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                            placeholder={t("checkout.phone_placeholder")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">{t("support.email")}</Label>
                          <Input
                            id="email"
                            type="email"
                            value={address.email}
                            onChange={(e) => setAddress({ ...address, email: e.target.value })}
                            placeholder={t("login.email")}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 2: Per-farmer shipping options (real quotes) */}
                {step === 2 && (
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-bold">{t("checkout.shipping_title")}</h2>
                      </div>
                      <p className="text-xs text-muted-foreground mb-5">
                        {t("checkout.shipping_description", { sellerCount: shippingGroups?.length ?? 0 })}
                      </p>

                      {cartQuotesMutation.isPending && (
                        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t("common.loading")}
                        </div>
                      )}

                      {!cartQuotesMutation.isPending && shippingGroups && (
                        <div className="space-y-5">
                          {shippingGroups.map((group) => {
                            const choice = shippingChoices[group.farmerId];
                            const choiceKey = choice ? `${choice.partnerId}|${choice.service}` : "";
                            return (
                              <div key={group.farmerId} className="rounded-xl border border-border" data-testid={`ship-group-${group.farmerId}`}>
                                <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 border-b border-border bg-muted/30 rounded-t-xl">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-sm truncate">{group.farmerName}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {group.locationEstimated ? `${group.farmerLocation} (seller location not set)` : group.farmerLocation} · {group.itemCount} item{group.itemCount === 1 ? "" : "s"} · {group.weightKg.toFixed(1)}kg · {group.distanceKm}km
                                    </p>
                                  </div>
                                </div>

                                {group.quotes.length === 0 ? (
                                  <div className="p-4 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-b-xl flex items-start gap-2">
                                    <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
                                    {t("shipping_quote.no_quotes_title")}
                                  </div>
                                ) : (
                                  <RadioGroup
                                    value={choiceKey}
                                    onValueChange={(v) => {
                                      const [partnerId, service] = v.split("|");
                                      setShippingChoices((prev) => ({
                                        ...prev,
                                        [group.farmerId]: { partnerId, service: service as ShipServiceType },
                                      }));
                                    }}
                                    className="p-3 space-y-2"
                                  >
                                    {group.quotes.slice(0, 5).map((q) => {
                                      const key = `${q.partnerId}|${q.service}`;
                                      const selected = choiceKey === key;
                                      return (
                                        <label
                                          key={q.id}
                                          data-testid={`quote-${group.farmerId}-${q.partnerId}`}
                                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                            selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                                          }`}
                                        >
                                          <RadioGroupItem value={key} id={`${group.farmerId}-${q.id}`} className="sr-only" />
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-semibold text-sm">{q.partnerName}</span>
                                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 capitalize">
                                                {q.service.replace("_", " ")}
                                              </Badge>
                                              {q.coldChain && (
                                                <Badge className="text-[10px] h-4 px-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                  {t("shipping_quote_cards.service_cold_chain")}
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {q.etaWindow}</span>
                                              <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" /> {q.rating.toFixed(1)}</span>
                                              <span>· {q.co2Kg.toFixed(2)}kg CO₂</span>
                                            </p>
                                          </div>
                                          <span className="font-bold text-base flex-shrink-0">£{q.price.toFixed(2)}</span>
                                        </label>
                                      );
                                    })}
                                  </RadioGroup>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Step 3: Manual payment */}
                {step === 3 && (
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-bold">{t("checkout.payment_title")}</h2>
                      </div>
                      <p className="text-xs text-muted-foreground mb-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                        Payment is arranged manually with the seller. No card details are collected by AgriConnect.
                      </p>

                      <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
                        <CreditCard className="h-10 w-10 mx-auto text-primary mb-3" />
                        <h3 className="font-bold text-base mb-1">Manual payment pending</h3>
                        <p className="text-sm text-muted-foreground mb-5">
                          Your order is created now. The seller can confirm it and arrange payment separately.
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1 max-w-sm mx-auto text-left">
                          <li className="flex items-start gap-2">
                            <Shield className="h-3.5 w-3.5 mt-0.5 text-green-600 flex-shrink-0" />
                            No payment gateway, escrow, or transaction fee is used for this order.
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-green-600 flex-shrink-0" />
                            Payment status remains manual until arranged outside the platform.
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 4: Order Review */}
                {step === 4 && (
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-bold">{t("checkout.review_title")}</h2>
                      </div>

                      <div className="space-y-4">
                        {/* Delivery address */}
                        <div className="bg-muted/50 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm">{t("checkout.deliver_to")}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {address.fullName}<br />
                            {address.line1}{address.line2 && `, ${address.line2}`}<br />
                            {address.city}{address.county && `, ${address.county}`} {address.postcode}
                          </p>
                        </div>

                        {/* Per-farmer shipping */}
                        <div className="bg-muted/50 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Truck className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm">{t("checkout.shipping_title")}</span>
                          </div>
                          <div className="space-y-1.5">
                            {shippingGroups?.map((g) => {
                              const c = shippingChoices[g.farmerId];
                              const q = c ? g.quotes.find((x) => x.partnerId === c.partnerId && x.service === c.service) : null;
                              return (
                                <div key={g.farmerId} className="flex justify-between items-start gap-2 text-sm">
                                  <div className="min-w-0">
                                    <p className="truncate font-medium">{g.farmerName}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {q ? `${q.partnerName} · ${q.service.replace("_", " ")} · ${q.etaWindow}` : "—"}
                                    </p>
                                  </div>
                                  <span className="font-bold text-sm flex-shrink-0">£{(q?.price ?? 0).toFixed(2)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Items */}
                        <div className="bg-muted/50 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm">{t("cart.order_items")} ({cart?.items.length})</span>
                          </div>
                          <div className="space-y-2">
                            {cart?.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-3">
                                <img
                                  src={getProductImage(item.product.name, item.product.categoryId, "sm")}
                                  alt={item.product.name}
                                  className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{item.product.name}</p>
                                  <p className="text-xs text-muted-foreground">x{item.quantity} · {item.product.farmerName}</p>
                                </div>
                                <span className="text-sm font-bold">£{(item.product.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Payment */}
                        <div className="bg-muted/50 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm">{t("checkout.payment_title")}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Manual payment pending — no online payment is collected.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-5 sticky bottom-0 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 md:static md:bg-transparent md:backdrop-blur-none md:py-0 md:mx-0 md:px-0 border-t border-border/40 md:border-0">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> {t("common.back")}
                </Button>
              )}
              {step < 4 ? (
                <Button onClick={nextStep} className="ml-auto gap-2 h-11 px-6" data-testid="btn-next-step">
                  {t("profile_wizard.continue_button")} <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => manualOrderMutation.mutate()}
                  disabled={manualOrderMutation.isPending}
                  className="ml-auto gap-2 h-11 px-6"
                  data-testid="btn-place-order"
                >
                  {manualOrderMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating order…</>
                  ) : (
                    <><CheckCircle className="h-4 w-4" /> Place order</>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <Card className="lg:sticky lg:top-4">
              <CardContent className="p-4 sm:p-5">
                <h3 className="font-bold mb-4">{t("checkout.review_title")}</h3>
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {cart?.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                        <img
                          src={getProductImage(item.product.name, item.product.categoryId, "sm")}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.product.name}</p>
                        <p className="text-[10px] text-muted-foreground">x{item.quantity}</p>
                      </div>
                      <span className="text-xs font-bold">£{((item.unitPrice ?? item.product.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <Separator className="mb-4" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                    <span>£{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("cart.delivery")}{shippingGroups && shippingGroups.length > 1 ? ` (${shippingGroups.length} ${t("logistics.parcels_tab").toLowerCase()})` : ""}</span>
                    <span data-testid="text-shipping-total">{shippingTotal === 0 ? <span className="text-muted-foreground">—</span> : `£${shippingTotal.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("checkout.vat")}</span>
                    <span>£{tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>{t("cart.total")}</span>
                    <span>£{total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
                  {t("checkout.secure_checkout")} · {t("checkout.secure_256bit")}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
