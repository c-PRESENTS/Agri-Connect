import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Provider = "stripe" | "paypal" | "razorpay";

const approvalFlags: Record<Provider, Array<{ key: string; label: string }>> = {
  stripe: [
    { key: "platformFeeApproved", label: "Platform fee collection approved" },
    { key: "connectApproved", label: "Connect platform approved" },
    { key: "platformCountryVerified", label: "Platform country verified" },
    { key: "sellerCountryEligibilityVerified", label: "Seller countries verified" },
    { key: "merchantOfRecordVerified", label: "Merchant-of-record model verified" },
    { key: "chargebackLiabilityVerified", label: "Chargeback liability verified" },
  ],
  paypal: [
    { key: "platformFeeApproved", label: "Platform fee collection approved" },
    { key: "partnerApproved", label: "Partner approval complete" },
    { key: "delayedDisbursementApproved", label: "Delayed disbursement approved" },
    { key: "sellerOnboardingApproved", label: "Seller onboarding approved" },
  ],
  razorpay: [
    { key: "platformFeeApproved", label: "Platform fee collection approved" },
    { key: "indianPlatformVerified", label: "Indian platform verified" },
    { key: "settlementAccountVerified", label: "Settlement account verified" },
    { key: "routeApproved", label: "Route approved" },
    { key: "financialTurnoverEligible", label: "Turnover eligibility verified" },
    { key: "payerPayeeTransparencyApproved", label: "Payer-payee declaration approved" },
    { key: "indiaTaxApproved", label: "India tax review approved" },
  ],
};

function iso(value: string): string {
  return new Date(value).toISOString();
}

export function OperatorProviderConfiguration() {
  const [provider, setProvider] = useState<Provider>("stripe");
  const [platformCountry, setPlatformCountry] = useState("GB");
  const [approvalVerifiedAt, setApprovalVerifiedAt] = useState("");
  const [nextReviewAt, setNextReviewAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [maximumHoldDays, setMaximumHoldDays] = useState(28);
  const [maximumFulfillmentDays, setMaximumFulfillmentDays] = useState(14);
  const [complianceSubmissionStatus, setComplianceSubmissionStatus] = useState("pending");
  const [complianceApprovalStatus, setComplianceApprovalStatus] = useState("pending");
  const [complianceVerifiedAt, setComplianceVerifiedAt] = useState("");
  const [complianceReviewAt, setComplianceReviewAt] = useState("");
  const [complianceExpiresAt, setComplianceExpiresAt] = useState("");
  const [maximumSellers, setMaximumSellers] = useState(1);
  const [maximumAllocations, setMaximumAllocations] = useState(1);
  const [partialRefund, setPartialRefund] = useState(false);
  const [independentRelease, setIndependentRelease] = useState(false);
  const [idempotentCreation, setIdempotentCreation] = useState(true);
  const [merchantLookup, setMerchantLookup] = useState(true);
  const [source, setSource] =
    useState<"provider_api" | "provider_contract" | "approved_configuration">("provider_contract");
  const [sourceReference, setSourceReference] = useState("");
  const [capabilitiesVerifiedAt, setCapabilitiesVerifiedAt] = useState("");
  const [capabilitiesExpiresAt, setCapabilitiesExpiresAt] = useState("");
  const [expectedWebhookEventBy, setExpectedWebhookEventBy] = useState("");

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest("PUT", `/api/payments/operator/providers/${provider}/configuration`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/operator/providers/readiness"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/operator/overview"] });
    },
  });

  function changeProvider(value: Provider) {
    setProvider(value);
    setPlatformCountry(value === "razorpay" ? "IN" : "GB");
    setFlags({});
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const configuration: Record<string, boolean | string | number> = { ...flags };
    if (expectedWebhookEventBy) {
      configuration.expectedWebhookEventBy = iso(expectedWebhookEventBy);
    }
    if (provider === "paypal") {
      configuration.maximumDelayedDisbursementDays = maximumHoldDays;
      configuration.maximumOrderFulfillmentDays = maximumFulfillmentDays;
    }
    if (provider === "razorpay") {
      configuration.complianceSubmissionStatus = complianceSubmissionStatus;
      configuration.complianceApprovalStatus = complianceApprovalStatus;
      configuration.complianceVerifiedAt = iso(complianceVerifiedAt);
      configuration.complianceReviewAt = iso(complianceReviewAt);
      configuration.complianceExpiresAt = iso(complianceExpiresAt);
    }
    save.mutate({
      platformCountry,
      approvalVerifiedAt: iso(approvalVerifiedAt),
      nextReviewAt: iso(nextReviewAt),
      expiresAt: iso(expiresAt),
      configuration,
      capabilities: {
        maximumSellersPerCheckout: maximumSellers,
        maximumAllocationsPerPayment: maximumAllocations,
        supportsPartialSellerRefund: partialRefund,
        supportsIndependentSellerRelease: independentRelease,
        supportsIdempotentPaymentCreation: idempotentCreation,
        supportsLookupByMerchantReference: merchantLookup,
        source,
        sourceReference,
        verifiedAt: iso(capabilitiesVerifiedAt),
        expiresAt: iso(capabilitiesExpiresAt),
      },
    });
  }

  const inputClass =
    "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm";

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="font-semibold">Provider approval and capability evidence</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Save verified business evidence here. Secrets remain environment-only and are never
          entered or returned by this screen.
        </p>
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-medium">
              Provider
              <select
                className={inputClass}
                value={provider}
                onChange={(event) => changeProvider(event.target.value as Provider)}
              >
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="razorpay">Razorpay</option>
              </select>
            </label>
            <label className="text-xs font-medium">
              Platform country
              <input
                className={inputClass}
                value={platformCountry}
                maxLength={2}
                required
                onChange={(event) => setPlatformCountry(event.target.value.toUpperCase())}
              />
            </label>
            <label className="text-xs font-medium">
              Approval verified
              <input className={inputClass} type="datetime-local" required value={approvalVerifiedAt}
                onChange={(event) => setApprovalVerifiedAt(event.target.value)} />
            </label>
            <label className="text-xs font-medium">
              Next review
              <input className={inputClass} type="datetime-local" required value={nextReviewAt}
                onChange={(event) => setNextReviewAt(event.target.value)} />
            </label>
            <label className="text-xs font-medium">
              Approval expires
              <input className={inputClass} type="datetime-local" required value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)} />
            </label>
            <label className="text-xs font-medium">
              Maximum sellers per checkout
              <input className={inputClass} type="number" min={1} max={1000} required value={maximumSellers}
                onChange={(event) => setMaximumSellers(Number(event.target.value))} />
            </label>
            <label className="text-xs font-medium">
              Maximum allocations per payment
              <input className={inputClass} type="number" min={1} max={5000} required value={maximumAllocations}
                onChange={(event) => setMaximumAllocations(Number(event.target.value))} />
            </label>
            <label className="text-xs font-medium">
              Evidence source
              <select className={inputClass} value={source}
                onChange={(event) => setSource(event.target.value as typeof source)}>
                <option value="provider_contract">Provider contract</option>
                <option value="provider_api">Provider API</option>
                <option value="approved_configuration">Approved configuration</option>
              </select>
            </label>
            <label className="text-xs font-medium sm:col-span-2">
              Evidence reference
              <input className={inputClass} required minLength={3} maxLength={500}
                value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} />
            </label>
            <label className="text-xs font-medium">
              Capabilities verified
              <input className={inputClass} type="datetime-local" required value={capabilitiesVerifiedAt}
                onChange={(event) => setCapabilitiesVerifiedAt(event.target.value)} />
            </label>
            <label className="text-xs font-medium">
              Capabilities expire
              <input className={inputClass} type="datetime-local" required value={capabilitiesExpiresAt}
                onChange={(event) => setCapabilitiesExpiresAt(event.target.value)} />
            </label>
            <label className="text-xs font-medium">
              Expected webhook event by (optional)
              <input className={inputClass} type="datetime-local" value={expectedWebhookEventBy}
                onChange={(event) => setExpectedWebhookEventBy(event.target.value)} />
            </label>
          </div>

          <fieldset>
            <legend className="text-xs font-semibold">Verified provider requirements</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {approvalFlags[provider].map((flag) => (
                <label key={flag.key} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={Boolean(flags[flag.key])}
                    onChange={(event) => setFlags((current) => ({
                      ...current,
                      [flag.key]: event.target.checked,
                    }))} />
                  {flag.label}
                </label>
              ))}
            </div>
          </fieldset>

          {provider === "paypal" && (
            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium">
                Approved delayed-disbursement days
                <input className={inputClass} type="number" min={1} max={28} required
                  value={maximumHoldDays} onChange={(event) => setMaximumHoldDays(Number(event.target.value))} />
              </label>
              <label className="block text-xs font-medium">
                Maximum order fulfilment days
                <input className={inputClass} type="number" min={1} max={27} required
                  value={maximumFulfillmentDays}
                  onChange={(event) => setMaximumFulfillmentDays(Number(event.target.value))} />
              </label>
            </div>
          )}

          {provider === "razorpay" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="text-xs font-medium">
                Submission status
                <select className={inputClass} value={complianceSubmissionStatus}
                  onChange={(event) => setComplianceSubmissionStatus(event.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label className="text-xs font-medium">
                Approval status
                <select className={inputClass} value={complianceApprovalStatus}
                  onChange={(event) => setComplianceApprovalStatus(event.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label className="text-xs font-medium">
                Compliance verified
                <input className={inputClass} type="datetime-local" required value={complianceVerifiedAt}
                  onChange={(event) => setComplianceVerifiedAt(event.target.value)} />
              </label>
              <label className="text-xs font-medium">
                Compliance review
                <input className={inputClass} type="datetime-local" required value={complianceReviewAt}
                  onChange={(event) => setComplianceReviewAt(event.target.value)} />
              </label>
              <label className="text-xs font-medium">
                Compliance expires
                <input className={inputClass} type="datetime-local" required value={complianceExpiresAt}
                  onChange={(event) => setComplianceExpiresAt(event.target.value)} />
              </label>
            </div>
          )}

          <fieldset>
            <legend className="text-xs font-semibold">Verified capabilities</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Partial seller refunds", partialRefund, setPartialRefund],
                ["Independent seller release", independentRelease, setIndependentRelease],
                ["Idempotent payment creation", idempotentCreation, setIdempotentCreation],
                ["Merchant-reference lookup", merchantLookup, setMerchantLookup],
              ].map(([label, checked, setter]) => (
                <label key={String(label)} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={Boolean(checked)}
                    onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} />
                  {String(label)}
                </label>
              ))}
            </div>
          </fieldset>

          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save verified configuration"}
          </Button>
          {save.isError && (
            <p role="alert" className="text-sm text-destructive">
              Configuration was rejected. Check evidence fields and dates.
            </p>
          )}
          {save.isSuccess && (
            <p role="status" className="text-sm text-emerald-600">
              Configuration saved for server-side validation.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
