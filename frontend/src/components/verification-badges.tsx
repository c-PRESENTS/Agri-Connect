import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ShieldCheck, Star, Store } from "lucide-react";

type VerificationProfile = {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  location?: string | null;
  role?: string | null;
  profileComplete?: boolean | null;
  isVerified?: boolean | null;
  rating?: number | null;
  reviewCount?: number | null;
};

export type VerificationTier = { label: string; complete: boolean };

export function getVerificationTiers(profile: VerificationProfile | null | undefined): VerificationTier[] {
  const isSeller = profile?.role === "farmer";
  const hasContact = Boolean(profile?.email || profile?.phone);
  const hasSellerDetails = isSeller && Boolean(profile?.profileComplete || (profile?.name && profile?.location));
  const verifiedSeller = isSeller && Boolean(profile?.isVerified);
  const trustedSeller = verifiedSeller && Number(profile?.rating ?? 0) >= 4.5 && Number(profile?.reviewCount ?? 0) >= 20;

  return [
    { label: "Basic Profile", complete: Boolean(profile) },
    { label: "Contact Details Added", complete: hasContact },
    { label: "Seller Details Added", complete: hasSellerDetails },
    { label: "Verified Seller", complete: verifiedSeller },
    { label: "Trusted Seller", complete: trustedSeller },
  ];
}

export function PublicSellerBadges({ rating, reviewCount }: { rating?: number | null; reviewCount?: number | null }) {
  const isTrusted = Number(rating ?? 0) >= 4.5 && Number(reviewCount ?? 0) >= 20;
  return <>
    <Badge variant="outline" className="gap-1 text-[10px]" data-testid="badge-seller"><Store className="h-3 w-3" /> Seller</Badge>
    {isTrusted && <Badge variant="secondary" className="gap-1 text-[10px] text-amber-700 dark:text-amber-300" data-testid="badge-trusted-seller"><Star className="h-3 w-3 fill-current" /> Trusted seller</Badge>}
  </>;
}

export function VerificationTiers({ profile }: { profile: VerificationProfile | null | undefined }) {
  const tiers = getVerificationTiers(profile);
  const isSeller = profile?.role === "farmer";
  const verified = Boolean(profile?.isVerified);

  return (
    <section aria-labelledby="verification-heading" className="mb-6 rounded-lg border bg-card p-4" data-testid="verification-tiers">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 id="verification-heading" className="font-semibold">Verification</h2><p className="text-sm text-muted-foreground">Progress based on your profile details.</p></div>
        <Badge variant={verified ? "default" : "secondary"} className="gap-1" data-testid="badge-account-indicator">
          {verified ? <ShieldCheck className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
          {verified ? `Verified ${isSeller ? "seller" : "buyer"}` : isSeller ? "Seller" : "Buyer"}
        </Badge>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {tiers.map((tier) => <div key={tier.label} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm" data-testid={`verification-tier-${tier.label.toLowerCase().replace(/\s+/g, "-")}`}>
          {tier.complete ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <span className={tier.complete ? "font-medium" : "text-muted-foreground"}>{tier.label}</span>
        </div>)}
      </div>
    </section>
  );
}
