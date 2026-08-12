import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Home,
  Loader2,
  MapPin,
  Package,
  Plus,
  Shield,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { Cart, SavedAddress, ShipQuote, ShipServiceType } from "@shared/schema";
import { useCurrency } from "@/contexts/currency-context";
import { CheckoutProgress } from "@/components/checkout-progress";
import { SafeProductImage } from "@/components/safe-product-image";

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

type BulkFulfilment = "collection" | "door_delivery";

function quoteForBulkMode(
  group: CartShippingGroup,
  mode: BulkFulfilment,
): ShipQuote | undefined {
  if (mode === "collection") {
    return group.quotes.find((quote) => quote.partnerId === "buyer-collection");
  }

  return group.quotes
    .filter((quote) => quote.partnerId !== "buyer-collection")
    .sort((first, second) => {
      const firstPriority = first.partnerId === "farmer-delivery" ? 0 : 1;
      const secondPriority = second.partnerId === "farmer-delivery" ? 0 : 1;
      return firstPriority - secondPriority || first.price - second.price;
    })[0];
}

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
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [newAddressLabel, setNewAddressLabel] = useState("Home");
  const [bulkFulfilment, setBulkFulfilment] = useState<BulkFulfilment>("door_delivery");
  const [applyBulkToAll, setApplyBulkToAll] = useState(true);

  const {
    data: cart,
    isLoading: isCartLoading,
    isError: isCartError,
    refetch: refetchCart,
  } = useQuery<Cart>({ queryKey: ["/api/cart"] });

  const {
    data: savedAddresses = [],
    isLoading: areAddressesLoading,
    isError: isAddressError,
  } = useQuery<SavedAddress[]>({
    queryKey: ["/api/account/addresses"],
    enabled: isAuthenticated,
    retry: false,
  });

  const saveAddress = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/account/addresses", {
        label: newAddressLabel.trim() || "Address",
        fullName: address.fullName.trim(),
        phone: address.phone.trim(),
        email: address.email.trim() || undefined,
        line1: address.line1.trim(),
        line2: address.line2.trim() || undefined,
        city: address.city.trim(),
        county: address.county.trim() || undefined,
        postcode: address.postcode.trim(),
        country: address.country,
      });
      return (await response.json()) as SavedAddress;
    },
  });

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
    if (selectedAddressId || areAddressesLoading) return;
    const preferred =
      savedAddresses.find((savedAddress) => savedAddress.isDefault) ??
      savedAddresses[0];
    if (preferred) {
      setSelectedAddressId(preferred.id);
      setAddress({
        fullName: preferred.fullName,
        phone: preferred.phone,
        email: preferred.email || user?.email || "",
        line1: preferred.line1,
        line2: preferred.line2 || "",
        city: preferred.city,
        county: preferred.county || "",
        postcode: preferred.postcode,
        country: preferred.country,
      });
      return;
    }
    setSelectedAddressId("new");
  }, [areAddressesLoading, savedAddresses, selectedAddressId, user?.email]);

  useEffect(() => {
    if (cart && cart.items.length === 0) navigate("/cart", { replace: true });
  }, [cart, navigate]);

  function selectCheckoutAddress(addressId: string) {
    setSelectedAddressId(addressId);
    setErrors({});
    if (addressId === "new") {
      setAddress({
        fullName: user?.name || "",
        phone: "",
        email: user?.email || "",
        line1: "",
        line2: "",
        city: "",
        county: "",
        postcode: "",
        country: "GB",
      });
      return;
    }

    const savedAddress = savedAddresses.find((candidate) => candidate.id === addressId);
    if (!savedAddress) return;
    setAddress({
      fullName: savedAddress.fullName,
      phone: savedAddress.phone,
      email: savedAddress.email || user?.email || "",
      line1: savedAddress.line1,
      line2: savedAddress.line2 || "",
      city: savedAddress.city,
      county: savedAddress.county || "",
      postcode: savedAddress.postcode,
      country: savedAddress.country,
    });
  }

  function applyBulkFulfilment(mode: BulkFulfilment, farmerIds = selectedFarmerIds) {
    if (!shippingGroups) return;
    const farmerIdSet = new Set(farmerIds);
    const missing: string[] = [];
    const selections: Record<string, { partnerId: string; service: ShipServiceType }> = {};
    for (const group of shippingGroups) {
      if (!farmerIdSet.has(group.farmerId)) continue;
      const quote = quoteForBulkMode(group, mode);
      if (!quote) {
        missing.push(group.farmerName);
        continue;
      }
      selections[group.farmerId] = {
        partnerId: quote.partnerId,
        service: quote.service,
      };
    }
    setShippingChoices((current) => {
      const next = { ...current };
      for (const group of shippingGroups) {
        if (!farmerIdSet.has(group.farmerId)) continue;
        if (selections[group.farmerId]) next[group.farmerId] = selections[group.farmerId];
        else delete next[group.farmerId];
      }
      return next;
    });
    if (missing.length) {
      toast({
        title: "Some sellers need a custom choice",
        description: `${missing.join(", ")} do not offer this fulfilment option.`,
        variant: "destructive",
      });
    }
  }

  function selectAllFarmers(checked: boolean) {
    const farmerIds = checked ? (shippingGroups ?? []).map((group) => group.farmerId) : [];
    setSelectedFarmerIds(farmerIds);
    if (!checked) {
      setShippingChoices({});
      return;
    }
    if (applyBulkToAll) applyBulkFulfilment(bulkFulfilment, farmerIds);
  }

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

  async function continueToFulfilment() {
    if (!validateAddress()) return;
    if (selectedAddressId === "new" && saveNewAddress) {
      try {
        const created = await saveAddress.mutateAsync();
        setSelectedAddressId(created.id);
      } catch (error) {
        toast({
          title: "Address was not saved",
          description: `${checkoutErrorMessage(error as Error)} Checkout will continue with the entered address.`,
          variant: "destructive",
        });
      }
    }
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
        <button
          type="button"
          onClick={() => (step === 2 ? setStep(1) : navigate("/cart"))}
          className="mb-6 flex items-center gap-2 text-sm sm:text-base font-black uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
          {step === 2 ? "Back to delivery details" : "Back to cart"}
        </button>

        <div className="mb-8 rounded-3xl border-2 border-border/80 bg-card px-4 py-6 shadow-md sm:px-8">
          <CheckoutProgress currentStep={2} />
        </div>

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight">Checkout</h1>
            <p className="mt-2 text-base sm:text-lg font-bold text-foreground/85">
              {step === 1
                ? "Delivery details"
                : "Select the farmers you want to check out"}
            </p>
          </div>
          <span className="text-sm sm:text-base font-black uppercase tracking-wider text-muted-foreground bg-muted/60 px-4 py-2 rounded-xl border w-fit">
            Delivery step {step} of 2
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2">
            {step === 1 ? (
              <Card className="border-2 border-border/80 rounded-3xl shadow-md p-2">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-6 flex items-center gap-3 pb-3 border-b">
                    <MapPin className="h-7 w-7 text-primary flex-shrink-0" />
                    <h2 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-wider">Delivery details</h2>
                  </div>
                  <div className="mb-7 space-y-3">
                    <div>
                      <h3 className="text-base font-black text-foreground">Saved addresses</h3>
                      <p className="mt-1 text-sm font-bold text-muted-foreground">
                        Choose an address or add a new one for this order.
                      </p>
                    </div>
                    {areAddressesLoading ? (
                      <div className="flex items-center gap-2 rounded-xl border-2 border-border/70 p-4 text-sm font-bold text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading saved addresses…
                      </div>
                    ) : (
                      <RadioGroup
                        value={selectedAddressId || "new"}
                        onValueChange={selectCheckoutAddress}
                        className="space-y-3"
                      >
                        {savedAddresses.map((savedAddress) => (
                          <label
                            key={savedAddress.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
                              selectedAddressId === savedAddress.id
                                ? "border-primary bg-primary/5"
                                : "border-border/70 hover:border-primary/40"
                            }`}
                          >
                            <RadioGroupItem value={savedAddress.id} className="mt-1" />
                            <Home className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2 font-black text-foreground">
                                {savedAddress.label}
                                {savedAddress.isDefault && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                              </span>
                              <span className="mt-1 block text-sm font-bold text-muted-foreground">
                                {savedAddress.line1}, {savedAddress.city}, {savedAddress.postcode}
                              </span>
                            </span>
                          </label>
                        ))}
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-colors ${
                            selectedAddressId === "new"
                              ? "border-primary bg-primary/5"
                              : "border-border/70 hover:border-primary/40"
                          }`}
                          data-testid="checkout-add-new-address"
                        >
                          <RadioGroupItem value="new" />
                          <Plus className="h-5 w-5 text-primary" />
                          <span className="font-black text-foreground">Add New Address</span>
                        </label>
                      </RadioGroup>
                    )}
                    {isAddressError && (
                      <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                        Saved addresses are unavailable right now. You can still enter an address for this order.
                      </p>
                    )}
                  </div>
                  <Separator className="mb-7" />
                  <div className="grid gap-5 sm:grid-cols-2">
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
                        <Label htmlFor={field} className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground mb-1.5 block">
                          {label}
                          {!["line2", "county"].includes(field) ? " *" : ""}
                        </Label>
                        <Input
                          id={field}
                          type={type}
                          value={address[field as keyof Address]}
                          aria-invalid={Boolean(errors[field])}
                          className={`h-12 text-base font-bold rounded-xl border-2 ${errors[field] ? "border-destructive" : ""}`}
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
                          <p className="mt-1.5 text-xs font-bold text-destructive">{errors[field]}</p>
                        )}
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <Label htmlFor="country" className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground mb-1.5 block">Country *</Label>
                      <Select
                        value={address.country}
                        onValueChange={(country) =>
                          setAddress((current) => ({ ...current, country }))
                        }
                      >
                        <SelectTrigger id="country" className="h-12 text-base font-bold rounded-xl border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2">
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code} className="text-base font-bold py-2.5">
                              {country.flag} {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedAddressId === "new" && (
                      <div className="sm:col-span-2 rounded-2xl border-2 border-border/70 bg-muted/20 p-4 space-y-4">
                        <label className="flex cursor-pointer items-center gap-3">
                          <Checkbox
                            checked={saveNewAddress}
                            onCheckedChange={(checked) => setSaveNewAddress(checked === true)}
                            data-testid="checkout-save-address"
                          />
                          <span>
                            <span className="block text-sm font-black text-foreground">Save this address</span>
                            <span className="block text-xs font-bold text-muted-foreground">
                              Use it faster during your next checkout.
                            </span>
                          </span>
                        </label>
                        {saveNewAddress && (
                          <div>
                            <Label htmlFor="address-label" className="text-xs font-black uppercase tracking-wider">
                              Address label
                            </Label>
                            <Input
                              id="address-label"
                              value={newAddressLabel}
                              maxLength={60}
                              onChange={(event) => setNewAddressLabel(event.target.value)}
                              placeholder="Home, Office, Farm…"
                              className="mt-1.5 h-11 border-2 font-bold"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-border/80 rounded-3xl shadow-md p-2">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-3 flex items-center gap-3">
                    <Truck className="h-7 w-7 text-primary flex-shrink-0" />
                    <h2 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-wider">Order Fulfillment Dashboard</h2>
                  </div>
                  <p className="mb-6 text-sm sm:text-base font-bold text-foreground/80 leading-relaxed">
                    Select one or more farmers, then choose fulfilment for each selected farmer.
                    Unselected products will stay in your cart.
                  </p>
                  {(shippingGroups?.length ?? 0) > 1 && (
                    <div className="mb-6 rounded-2xl border-2 border-primary/25 bg-primary/5 p-5 space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-foreground">
                            Fulfilment for selected sellers
                          </h3>
                          <p className="mt-1 text-sm font-bold text-muted-foreground">
                            Choose once and apply the available option to every selected seller.
                          </p>
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm font-black">
                          <Checkbox
                            checked={selectedFarmerIds.length === shippingGroups?.length}
                            onCheckedChange={(checked) => selectAllFarmers(checked === true)}
                            data-testid="checkout-select-all-sellers"
                          />
                          Select all sellers
                        </label>
                      </div>
                      <RadioGroup
                        value={bulkFulfilment}
                        onValueChange={(value) => {
                          const mode = value as BulkFulfilment;
                          setBulkFulfilment(mode);
                          if (applyBulkToAll) applyBulkFulfilment(mode);
                        }}
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-border/70 bg-background p-4">
                          <RadioGroupItem value="door_delivery" />
                          <Truck className="h-5 w-5 text-primary" />
                          <span className="font-black">Door Delivery</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-border/70 bg-background p-4">
                          <RadioGroupItem value="collection" />
                          <MapPin className="h-5 w-5 text-primary" />
                          <span className="font-black">Collect from Farmers</span>
                        </label>
                      </RadioGroup>
                      <label className="flex cursor-pointer items-center gap-3 text-sm font-black text-foreground">
                        <Checkbox
                          checked={applyBulkToAll}
                          onCheckedChange={(checked) => {
                            const enabled = checked === true;
                            setApplyBulkToAll(enabled);
                            if (enabled) applyBulkFulfilment(bulkFulfilment);
                          }}
                          data-testid="checkout-apply-fulfilment-all"
                        />
                        Apply this option to all selected sellers
                      </label>
                    </div>
                  )}
                  <div className="space-y-6">
                    {shippingGroups?.map((group) => {
                      const isFarmerSelected = selectedFarmerIdSet.has(group.farmerId);
                      const selected = shippingChoices[group.farmerId];
                      const selectedKey = selected
                        ? `${selected.partnerId}|${selected.service}`
                        : "";
                      return (
                        <div key={group.farmerId} className="rounded-2xl border-2 border-border/80 overflow-hidden shadow-xs">
                          <div className="border-b-2 border-border/60 bg-muted/40 px-5 py-4">
                            <label className="flex cursor-pointer items-center gap-3.5">
                              <Checkbox
                                checked={isFarmerSelected}
                                className="h-5 w-5 rounded-md border-2"
                                onCheckedChange={(checked) => {
                                  if (checked === true) {
                                    setSelectedFarmerIds((current) =>
                                      current.includes(group.farmerId)
                                        ? current
                                        : [...current, group.farmerId],
                                    );
                                    if (applyBulkToAll) {
                                      applyBulkFulfilment(bulkFulfilment, [group.farmerId]);
                                    }
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
                                <span className="block text-base sm:text-lg font-black text-foreground">
                                  {group.farmerName}
                                </span>
                                <span className="block text-xs sm:text-sm font-bold text-muted-foreground">
                                  {group.farmerLocation} · {group.itemCount} item
                                  {group.itemCount === 1 ? "" : "s"}
                                </span>
                              </span>
                              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground bg-background px-3 py-1 rounded-lg border">
                                {isFarmerSelected ? "Selected" : "Select farmer"}
                              </span>
                            </label>
                          </div>
                          {isFarmerSelected && group.quotes.length ? (
                            <RadioGroup
                              value={selectedKey}
                              className="space-y-3 p-4"
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
                                    className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                                      selectedKey === value
                                        ? "border-primary bg-primary/10 shadow-xs"
                                        : "border-border/80 hover:border-primary/40"
                                    }`}
                                  >
                                    <RadioGroupItem value={value} className="h-5 w-5" />
                                    {direct ? (
                                      <MapPin className="h-6 w-6 shrink-0 text-primary" />
                                    ) : (
                                      <Truck className="h-6 w-6 shrink-0 text-primary" />
                                    )}
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-base font-black text-foreground">
                                        {quote.partnerName}
                                      </span>
                                      <span className="block text-xs sm:text-sm font-bold text-foreground/80">
                                        {direct
                                          ? `Collect directly from ${group.farmerName}.`
                                          : quote.partnerId === "farmer-delivery"
                                            ? `${group.farmerName} delivers to your address.`
                                            : "Delivered by a carrier; online prepayment is required."}
                                      </span>
                                    </span>
                                    <span className="text-base sm:text-lg font-black text-primary">
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
                            <div className="flex items-start gap-2.5 p-5 text-base font-bold text-destructive">
                              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                              No fulfilment options are available for this farmer.
                            </div>
                          ) : (
                            <p className="px-5 py-4 text-sm sm:text-base font-bold text-muted-foreground">
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

            <div className="mt-6 flex flex-wrap gap-4">
              {step === 2 && (
                <Button variant="outline" className="h-13 px-6 text-sm sm:text-base font-black uppercase tracking-wider border-2" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-1 h-5 w-5 stroke-[2.5]" /> Back
                </Button>
              )}
              <Button
                className="ml-auto h-13 sm:h-14 px-8 text-base sm:text-lg font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-lg transition-transform hover:scale-[1.01]"
                disabled={shippingQuotes.isPending || createQuote.isPending || saveAddress.isPending}
                onClick={step === 1 ? continueToFulfilment : continueToPayment}
              >
                {shippingQuotes.isPending || createQuote.isPending || saveAddress.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {step === 1 ? "Loading options…" : "Preparing payment…"}
                  </>
                ) : (
                  <>
                    {step === 1 ? "Continue to fulfilment" : "Proceed to payment"}
                    <ChevronRight className="ml-2 h-5 w-5 stroke-[3]" />
                  </>
                )}
              </Button>
            </div>
          </section>

          <aside>
            <Card className="lg:sticky lg:top-4 border-2 border-border/80 rounded-3xl shadow-md p-2">
              <CardContent className="p-6 space-y-5">
                <h2 className="font-black text-xl sm:text-2xl uppercase tracking-wider text-foreground">
                  {step === 2 ? "Selected order summary" : "Order summary"}
                </h2>
                {step === 2 && (
                  <p className="text-xs sm:text-sm font-bold text-muted-foreground">
                    {selectedFarmerIds.length
                      ? `${selectedFarmerIds.length} farmer${selectedFarmerIds.length === 1 ? "" : "s"} selected`
                      : "Select at least one farmer"}
                  </p>
                )}
                <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
                  {displayedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30 border">
                      <SafeProductImage
                        src={resolveProductImageForProduct(item.product).src}
                        fallbackSrc={resolveProductImageForProduct(item.product).fallbackSrc}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover border flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-foreground">{item.product.name}</p>
                        <p className="text-xs font-bold text-muted-foreground">Qty {item.quantity}</p>
                      </div>
                      <span className="text-sm font-black text-foreground">
                        {format((item.unitPrice ?? item.product.price) * item.quantity, {
                          sourceCurrency: item.product.currency || "GBP",
                          includeCode: true,
                        })}
                      </span>
                    </div>
                  ))}
                  {step === 2 && displayedItems.length === 0 && (
                    <p className="py-6 text-center text-sm font-bold text-muted-foreground">
                      Selected farmers&apos; products will appear here.
                    </p>
                  )}
                </div>
                <Separator className="my-4 h-0.5" />
                <div className="space-y-3 text-base">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-muted-foreground">Subtotal</span>
                    <span className="font-black text-foreground">{format(subtotal, { includeCode: true })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-muted-foreground">Delivery</span>
                    <span className="font-black text-foreground">{shippingTotal ? format(shippingTotal, { includeCode: true }) : "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-muted-foreground">Taxes</span>
                    <span className="text-right text-xs font-bold text-muted-foreground">Included where applicable</span>
                  </div>
                  <Separator className="my-2 h-0.5" />
                  <div className="flex justify-between items-center">
                    <span className="font-black text-lg sm:text-xl uppercase tracking-wider text-foreground">Total</span>
                    <span className="font-black text-2xl text-primary">{format(displayedTotal, { includeCode: true })}</span>
                  </div>
                </div>
                {currency !== "GBP" && (
                  <div className="mt-4 rounded-xl border-2 border-amber-300/80 bg-amber-50 p-4 text-xs sm:text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                    <p className="font-black text-sm sm:text-base">
                      Estimated {format(displayedTotal, { includeCode: true })}
                    </p>
                    <p className="mt-1 font-bold">
                      You will be charged £{displayedTotal.toFixed(2)} GBP. Converted prices are estimates.
                    </p>
                  </div>
                )}
                <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-muted/60 p-4 text-xs sm:text-sm font-bold text-foreground/80 border">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
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
