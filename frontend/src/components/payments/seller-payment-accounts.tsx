import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, RefreshCw, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type Provider = "stripe" | "paypal" | "razorpay";

interface SellerPaymentAccount {
  provider: Provider;
  platformStatus: string;
  status: string;
  country?: string | null;
  currencies: string[];
  kycVerifiedAt?: string | null;
  lastVerifiedAt?: string | null;
  nextReviewAt?: string | null;
  suspensionReason?: string | null;
}

const names: Record<Provider, string> = {
  stripe: "Stripe",
  paypal: "PayPal",
  razorpay: "Razorpay Route",
};

export function SellerPaymentAccounts() {
  const { toast } = useToast();
  const [country, setCountry] = useState("GB");
  const { data, isLoading } = useQuery<{ accounts: SellerPaymentAccount[] }>({
    queryKey: ["/api/payments/seller/accounts"],
  });
  const { data: cashPreferences } = useQuery<{
    acceptsCashAtPickup: boolean;
    acceptsCashOnFarmerDelivery: boolean;
  }>({
    queryKey: ["/api/payments/seller/cash-preferences"],
  });

  const onboarding = useMutation({
    mutationFn: async (provider: Provider) => {
      const selectedCountry = provider === "razorpay" ? "IN" : country;
      const response = await apiRequest(
        "POST",
        `/api/payments/seller/accounts/${provider}/onboarding`,
        { country: selectedCountry },
      );
      return response.json() as Promise<{ redirectUrl: string }>;
    },
    onSuccess: ({ redirectUrl }) => {
      window.location.assign(redirectUrl);
    },
    onError: (error: Error) => {
      toast({
        title: "Could not start payment onboarding",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refresh = useMutation({
    mutationFn: async (provider: Provider) => {
      const response = await apiRequest(
        "POST",
        `/api/payments/seller/accounts/${provider}/refresh`,
        {},
      );
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/payments/seller/accounts"] });
      toast({ title: "Payment account status refreshed" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not refresh payment account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCashPreferences = useMutation({
    mutationFn: async (next: {
      acceptsCashAtPickup: boolean;
      acceptsCashOnFarmerDelivery: boolean;
    }) => {
      const response = await apiRequest(
        "PATCH",
        "/api/payments/seller/cash-preferences",
        next,
      );
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/payments/seller/cash-preferences"],
      });
      toast({ title: "Cash payment preferences updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not update cash preferences",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <section aria-labelledby="seller-payment-accounts-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="seller-payment-accounts-heading" className="text-base font-bold">
            Seller payment accounts
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete provider-hosted verification before protected payments can be offered.
          </p>
        </div>
        <div className="w-36">
          <Label htmlFor="seller-payment-country" className="text-xs">Business country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger id="seller-payment-country" className="mt-1 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GB">United Kingdom</SelectItem>
              <SelectItem value="IN">India</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading payment accounts
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {(data?.accounts ?? []).map((account) => {
            const active = account.status === "active";
            const platformAvailable = ["sandbox_ready", "active"].includes(account.platformStatus);
            const demoAvailable = platformAvailable && account.platformStatus === "sandbox_ready";
            return (
              <Card key={account.provider}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{names[account.provider]}</span>
                    </div>
                    <Badge variant={active ? "default" : "secondary"}>{account.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <div className="mt-3 min-h-14 text-xs text-muted-foreground">
                    {active ? (
                      <span className="flex gap-1.5 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        KYC and payment capabilities are current.
                      </span>
                    ) : account.suspensionReason ? (
                      <span className="flex gap-1.5 text-amber-700 dark:text-amber-400">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {account.suspensionReason}
                      </span>
                    ) : !platformAvailable ? (
                      "Platform approval is not complete for this provider."
                    ) : demoAvailable ? (
                      "MVP testing mode is enabled. You can preview seller onboarding locally."
                    ) : (
                      "Onboarding or provider review is still required."
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="h-8 flex-1 gap-1.5 text-xs"
                      disabled={!platformAvailable || onboarding.isPending}
                      onClick={() => onboarding.mutate(account.provider)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {account.status === "not_started" ? "Onboard" : "Continue"}
                    </Button>
                    {account.status !== "not_started" && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        aria-label={`Refresh ${names[account.provider]} status`}
                        disabled={refresh.isPending}
                        onClick={() => refresh.mutate(account.provider)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="mb-4">
            <h3 className="font-semibold">Cash payments</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose when buyers may pay you directly. Cash orders are not protected by an online payment provider.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="cash-at-pickup" className="cursor-pointer">
                <span className="block text-sm font-medium">Accept cash at pickup</span>
                <span className="block text-xs font-normal text-muted-foreground">Buyer pays when collecting from you.</span>
              </Label>
              <Switch
                id="cash-at-pickup"
                checked={cashPreferences?.acceptsCashAtPickup ?? false}
                disabled={!cashPreferences || updateCashPreferences.isPending}
                onCheckedChange={(checked) =>
                  updateCashPreferences.mutate({
                    acceptsCashAtPickup: checked,
                    acceptsCashOnFarmerDelivery:
                      cashPreferences?.acceptsCashOnFarmerDelivery ?? false,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="cash-on-farmer-delivery" className="cursor-pointer">
                <span className="block text-sm font-medium">Accept cash on farmer delivery</span>
                <span className="block text-xs font-normal text-muted-foreground">Buyer pays when you deliver the order.</span>
              </Label>
              <Switch
                id="cash-on-farmer-delivery"
                checked={cashPreferences?.acceptsCashOnFarmerDelivery ?? false}
                disabled={!cashPreferences || updateCashPreferences.isPending}
                onCheckedChange={(checked) =>
                  updateCashPreferences.mutate({
                    acceptsCashAtPickup:
                      cashPreferences?.acceptsCashAtPickup ?? false,
                    acceptsCashOnFarmerDelivery: checked,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
