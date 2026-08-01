import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Package,
  Shield,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TopNavigation } from "@/components/top-navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { COUNTRIES } from "@/lib/countries";
import { resolveProductImageForProduct } from "@/lib/product-images";
import { createCheckoutQuote } from "@/lib/payment-client";
import type { Cart, ShipQuote, ShipServiceType } from "@shared/schema";
import { useCurrency } from "@/contexts/currency-context";
import { CheckoutProgress } from "@/components/checkout-progress";

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

type Address = {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  phone: string;
  email: string;
};

function checkoutErrorMessage(error: Error): string {
  const responseText = error.message.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(responseText) as { error?: unknown };
    return typeof parsed.error === "string" ? parsed.error : responseText;
  } catch {
    return responseText;
  }
}

export default function CheckoutPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const { currency, format } = useCurrency();
  const [step, setStep] = useState<1 | 2>(1);
  const [address, setAddress] = useState<Address>({
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shippingGroups, setShippingGroups] = useState<CartShippingGroup[] | null>(null);
  const [shippingChoices, setShippingChoices] = useState<
    Record<string, { partnerId: string; service: ShipServiceType }>
  >({});
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);

  const {
    data: cart,
    isLoading: isCartLoading,
    isError: isCartError,
    refetch: refetchCart,
  } = useQuery<Cart>({ queryKey: ["/api/cart"] });

  const selectedFarmerIdSet = useMemo(
    () => new Set(selectedFarmerIds),
    [selectedFarmerIds],
  );
  const displayedItems = useMemo(
    () =>
      step === 1
        ? (cart?.items ?? [])
        : (cart?.items ?? []).filter((item) =>
            selectedFarmerIdSet.has(item.product.farmerId),
          ),
    [cart?.items, selectedFarmerIdSet, step],
  );
  const subtotal = useMemo(
    () =>
      displayedItems.reduce(
        (sum, item) =>
          sum + (item.unitPrice ?? item.product.price) * item.quantity,
        0,
      ),
    [displayedItems],
  );
  const shippingTotal = useMemo(() => {
    if (!shippingGroups) return 0;
    return shippingGroups.reduce((sum, group) => {
      const selected = shippingChoices[group.farmerId];
      const quote = selected
        ? group.quotes.find(
            (candidate) =>
              candidate.partnerId === selected.partnerId &&
              candidate.service === selected.service,
          )
        : undefined;
      return sum + (quote?.price ?? 0);
    }, 0);
  }, [shippingChoices, shippingGroups]);
  const displayedTotal = subtotal + shippingTotal;

  const shippingQuotes = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cart/shipping-quotes", {
        drop: {
          name: address.fullName.trim(),
          phone: address.phone.trim(),
          email: address.email.trim(),
          line1: address.line1.trim(),
          line2: address.line2.trim() || undefined,
          city: address.city.trim(),
          county: address.county.trim() || undefined,
          postcode: address.postcode.trim(),
          country: address.country,
        },
      });
      return (await response.json()) as CartShippingResponse;
    },
    onSuccess: (result) => {
      setShippingGroups(result.groups);
      setShippingChoices({});
      setSelectedFarmerIds([]);
      setStep(2);
    },
    onError: (error: Error) => {
      toast({
        title: "Could not load fulfilment options",
        description: checkoutErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const createQuote = useMutation({
    mutationFn: async () => {
      const deliveryMethod =
        Object.values(shippingChoices).length > 0 &&
        Object.values(shippingChoices).every(
          (choice) => choice.partnerId === "buyer-collection",
        )
          ? "pickup"
          : "standard";
      return createCheckoutQuote({
        currency: currency === "INR" ? "INR" : "GBP",
        deliveryMethod,
        sellerIds: selectedFarmerIds,
        shippingChoices,
        deliveryAddressStruct: {
          name: address.fullName.trim(),
          phone: address.phone.trim(),
          email: address.email.trim(),
          line1: address.line1.trim(),
          line2: address.line2.trim() || undefined,
          city: address.city.trim(),
          county: address.county.trim() || undefined,
          postcode: address.postcode.trim(),
          country: address.country,
        },
      });
    },
    onSuccess: (quote) => navigate(`/checkout/payment/${quote.id}`),
    onError: (error: Error) => {
      toast({
        title: "Could not prepare payment",
        description: checkoutErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate("/login?next=%2Fcheckout");
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!user) return;
    setAddress((current) => ({
      ...current,
      fullName: current.fullName || user.name || "",
      email: current.email || user.email || "",
    }));
  }, [user]);

  useEffect(() => {
    if (cart && cart.items.length === 0) navigate("/cart", { replace: true });
  }, [cart, navigate]);

  function validateAddress(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!address.fullName.trim()) nextErrors.fullName = "Full name is required";
    if (!address.line1.trim()) nextErrors.line1 = "Address is required";
    if (!address.city.trim()) nextErrors.city = "City is required";
    if (!address.postcode.trim()) nextErrors.postcode = "Postcode is required";
    if (!address.phone.trim()) nextErrors.phone = "Phone is required";
    if (!address.email.trim()) nextErrors.email = "Email is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function continueToFulfilment() {
    if (!validateAddress()) return;
    shippingQuotes.mutate();
  }

  function continueToPayment() {
    if (!shippingGroups?.length) {
      toast({ title: "No fulfilment options are available", variant: "destructive" });
      return;
    }
    if (selectedFarmerIds.length === 0) {
      toast({
        title: "Choose at least one farmer",
        description: "Select the farmer orders you want to pay for now.",
        variant: "destructive",
      });
      return;
    }
    const missing = shippingGroups.filter(
      (group) =>
        selectedFarmerIdSet.has(group.farmerId) &&
        !shippingChoices[group.farmerId],
    );
    if (missing.length) {
      toast({
        title: "Choose fulfilment for each selected farmer",
        description: missing.map((group) => group.farmerName).join(", "),
        variant: "destructive",
      });
      return;
    }
    createQuote.mutate();
  }

  if (isAuthLoading || isCartLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="flex justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (isCartError) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="px-4 py-20 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="text-xl font-bold">Unable to load checkout</h1>
          <Button variant="outline" className="mt-5" onClick={() => refetchCart()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <main className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-7">
        <button
          type="button"
          onClick={() => (step === 2 ? setStep(1) : navigate("/cart"))}
          className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 2 ? "Back to delivery details" : "Back to cart"}
        </button>

        <div className="mb-7 rounded-2xl border bg-card px-3 py-4 shadow-sm sm:px-6">
          <CheckoutProgress currentStep={2} />
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">Checkout</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === 1
                ? "Delivery details"
                : "Select the farmers you want to check out"}
            </p>
          </div>
          <span className="text-sm font-semibold text-muted-foreground">
            Delivery step {step} of 2
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            {step === 1 ? (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="mb-5 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold">Delivery details</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["fullName", "Full name", "text"],
                      ["phone", "Phone", "tel"],
                      ["line1", "Address", "text"],
                      ["line2", "Address line 2", "text"],
                      ["city", "City", "text"],
                      ["county", "County", "text"],
                      ["postcode", "Postcode", "text"],
                      ["email", "Email", "email"],
                    ].map(([field, label, type]) => (
                      <div
                        key={field}
                        className={field === "line1" || field === "line2" ? "sm:col-span-2" : ""}
                      >
                        <Label htmlFor={field}>
                          {label}
                          {!["line2", "county"].includes(field) ? " *" : ""}
                        </Label>
                        <Input
                          id={field}
                          type={type}
                          value={address[field as keyof Address]}
                          aria-invalid={Boolean(errors[field])}
                          className={errors[field] ? "border-destructive" : ""}
                          onChange={(event) =>
                            setAddress((current) => ({
                              ...current,
                              [field]:
                                field === "postcode"
                                  ? event.target.value.toUpperCase()
                                  : event.target.value,
                            }))
                          }
                        />
                        {errors[field] && (
                          <p className="mt-1 text-xs text-destructive">{errors[field]}</p>
                        )}
                      </div>
                    ))}
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Select
                        value={address.country}
                        onValueChange={(country) =>
                          setAddress((current) => ({ ...current, country }))
                        }
                      >
                        <SelectTrigger id="country">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.flag} {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold">Order Fulfillment Dashboard</h2>
                  </div>
                  <p className="mb-5 text-sm text-muted-foreground">
                    Select one or more farmers, then choose fulfilment for each selected farmer.
                    Unselected products will stay in your cart.
                  </p>
                  <div className="space-y-5">
                    {shippingGroups?.map((group) => {
                      const isFarmerSelected = selectedFarmerIdSet.has(group.farmerId);
                      const selected = shippingChoices[group.farmerId];
                      const selectedKey = selected
                        ? `${selected.partnerId}|${selected.service}`
                        : "";
                      return (
                        <div key={group.farmerId} className="rounded-xl border border-border">
                          <div className="border-b border-border bg-muted/30 px-4 py-3">
                            <label className="flex cursor-pointer items-center gap-3">
                              <Checkbox
                                checked={isFarmerSelected}
                                onCheckedChange={(checked) => {
                                  if (checked === true) {
                                    setSelectedFarmerIds((current) =>
                                      current.includes(group.farmerId)
                                        ? current
                                        : [...current, group.farmerId],
                                    );
                                    return;
                                  }
                                  setSelectedFarmerIds((current) =>
                                    current.filter((id) => id !== group.farmerId),
                                  );
                                  setShippingChoices((current) => {
                                    const next = { ...current };
                                    delete next[group.farmerId];
                                    return next;
                                  });
                                }}
                                aria-label={`Include ${group.farmerName} in this checkout`}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block font-semibold">
                                  {group.farmerName}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {group.farmerLocation} · {group.itemCount} item
                                  {group.itemCount === 1 ? "" : "s"}
                                </span>
                              </span>
                              <span className="text-xs font-semibold text-muted-foreground">
                                {isFarmerSelected ? "Selected" : "Select farmer"}
                              </span>
                            </label>
                          </div>
                          {isFarmerSelected && group.quotes.length ? (
                            <RadioGroup
                              value={selectedKey}
                              className="space-y-2 p-3"
                              onValueChange={(value) => {
                                const [partnerId, service] = value.split("|");
                                setShippingChoices((current) => ({
                                  ...current,
                                  [group.farmerId]: {
                                    partnerId,
                                    service: service as ShipServiceType,
                                  },
                                }));
                              }}
                            >
                              {group.quotes.map((quote) => {
                                const value = `${quote.partnerId}|${quote.service}`;
                                const direct = quote.partnerId === "buyer-collection";
                                return (
                                  <label
                                    key={quote.id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                                      selectedKey === value
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/40"
                                    }`}
                                  >
                                    <RadioGroupItem value={value} />
                                    {direct ? (
                                      <MapPin className="h-5 w-5 shrink-0 text-primary" />
                                    ) : (
                                      <Truck className="h-5 w-5 shrink-0 text-primary" />
                                    )}
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-sm font-semibold">
                                        {quote.partnerName}
                                      </span>
                                      <span className="block text-xs text-muted-foreground">
                                        {direct
                                          ? `Collect directly from ${group.farmerName}.`
                                          : quote.partnerId === "farmer-delivery"
                                            ? `${group.farmerName} delivers to your address.`
                                            : "Delivered by a carrier; online prepayment is required."}
                                      </span>
                                    </span>
                                    <span className="text-sm font-bold">
                                      {quote.price === 0
                                        ? "Free"
                                        : format(quote.price, {
                                            sourceCurrency: quote.currency || "GBP",
                                            includeCode: true,
                                          })}
                                    </span>
                                  </label>
                                );
                              })}
                            </RadioGroup>
                          ) : isFarmerSelected ? (
                            <div className="flex items-start gap-2 p-4 text-sm text-destructive">
                              <AlertCircle className="mt-0.5 h-4 w-4" />
                              No fulfilment options are available for this farmer.
                            </div>
                          ) : (
                            <p className="px-4 py-3 text-sm text-muted-foreground">
                              Select this farmer to view fulfilment options.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mt-5 flex gap-3">
              {step === 2 && (
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              )}
              <Button
                className="ml-auto"
                disabled={shippingQuotes.isPending || createQuote.isPending}
                onClick={step === 1 ? continueToFulfilment : continueToPayment}
              >
                {shippingQuotes.isPending || createQuote.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {step === 1 ? "Loading options…" : "Preparing payment…"}
                  </>
                ) : (
                  <>
                    {step === 1 ? "Continue to fulfilment" : "Proceed to payment"}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </section>

          <aside>
            <Card className="lg:sticky lg:top-4">
              <CardContent className="p-4 sm:p-5">
                <h2 className="mb-1 font-bold">
                  {step === 2 ? "Selected order summary" : "Order summary"}
                </h2>
                {step === 2 && (
                  <p className="mb-4 text-xs text-muted-foreground">
                    {selectedFarmerIds.length
                      ? `${selectedFarmerIds.length} farmer${selectedFarmerIds.length === 1 ? "" : "s"} selected`
                      : "Select at least one farmer"}
                  </p>
                )}
                <div className="max-h-52 space-y-3 overflow-y-auto">
                  {displayedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <img
                        src={resolveProductImageForProduct(item.product).src}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                      </div>
                      <span className="text-xs font-bold">
                        {format((item.unitPrice ?? item.product.price) * item.quantity, {
                          sourceCurrency: item.product.currency || "GBP",
                          includeCode: true,
                        })}
                      </span>
                    </div>
                  ))}
                  {step === 2 && displayedItems.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Selected farmers&apos; products will appear here.
                    </p>
                  )}
                </div>
                <Separator className="my-4" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{format(subtotal, { includeCode: true })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>{shippingTotal ? format(shippingTotal, { includeCode: true }) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes</span>
                    <span className="text-right text-xs">Included where applicable</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span>{format(displayedTotal, { includeCode: true })}</span>
                  </div>
                </div>
                {currency !== "GBP" && (
                  <div className="mt-3 rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                    <p className="font-bold">
                      Estimated {format(displayedTotal, { includeCode: true })}
                    </p>
                    <p className="mt-1">
                      You will be charged £{displayedTotal.toFixed(2)} GBP. Converted prices are estimates.
                    </p>
                  </div>
                )}
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  Final totals are calculated and locked securely by AgriConnect before payment.
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
