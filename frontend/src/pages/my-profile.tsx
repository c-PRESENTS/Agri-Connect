import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Edit3, GraduationCap, MapPin, Package, Plus, ShieldCheck, Store } from "lucide-react";
import { TopNavigation } from "@/components/top-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SafeProductImage } from "@/components/safe-product-image";
import { VerificationTiers } from "@/components/verification-badges";
import { ProfileCompletionChecklist } from "@/components/profile-completion";
import { useAuth } from "@/hooks/use-auth";
import { resolveProductImageForProduct } from "@/lib/product-images";
import { LISTING_POLICY } from "@/lib/listing-policy";
import type { Product } from "@shared/schema";

function safePrice(product: Product) {
  return Number.isFinite(product.price) && product.price >= 0
    ? `£${product.price.toFixed(2)}`
    : "Price not set";
}

function safeCategory(product: Product) {
  return product.categoryId?.trim().replace(/-/g, " ") || "Uncategorised";
}

export default function MyProfilePage() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isUserLoading } = useAuth();
  const userId = user?.id;
  const { data: products = [], isLoading, isError } = useQuery<Product[]>({
    queryKey: ["/api/farmers", userId, "products"],
    queryFn: async () => {
      const response = await fetch(`/api/farmers/${encodeURIComponent(userId!)}/products`);
      if (!response.ok) throw new Error("Unable to load your listings.");
      return response.json();
    },
    enabled: Boolean(userId),
  });

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="heading-my-profile">My Profile</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Manage only the products listed from your account.</p>
          </div>
          <Button onClick={() => setLocation("/dashboard/list-product")} data-testid="button-add-profile-listing">
            <Plus className="mr-2 h-4 w-4" /> Add product
          </Button>
        </div>

        <div className="mb-6 rounded-lg border bg-muted/30 p-4" data-testid="my-profile-listing-policy">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{LISTING_POLICY.title}</h2><p className="mt-1 text-sm text-muted-foreground">{LISTING_POLICY.zeroEntryMessage}</p><p className="mt-1 text-xs text-muted-foreground">{LISTING_POLICY.enforcementMessage}</p></div><Button variant="outline" size="sm" onClick={() => setLocation("/student-help-point")} data-testid="button-profile-student-help"><GraduationCap className="mr-2 h-4 w-4" />Student Help Point</Button></div>
        </div>

        <VerificationTiers profile={user} />

        <div className="mb-6 rounded-lg border bg-card p-4"><ProfileCompletionChecklist profile={user} compact /><Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/profile-completion")} data-testid="button-open-profile-completion">Open checklist</Button></div>

        <section aria-labelledby="my-listings-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 id="my-listings-heading" className="text-lg font-semibold">My listed products</h2>
            </div>
            {!isLoading && !isUserLoading && <Badge variant="secondary">{products.length} listings</Badge>}
          </div>

          {isLoading || isUserLoading ? (
            <p className="text-sm text-muted-foreground">Loading your listings...</p>
          ) : isError ? (
            <Card data-testid="my-profile-listings-error">
              <CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
                Your listings could not be loaded right now. Please try again later.
              </CardContent>
            </Card>
          ) : products.length === 0 ? (
            <Card data-testid="my-profile-empty-state">
              <CardContent className="flex flex-col items-center px-6 py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Package className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold">No listed products yet</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">Create a listing to manage it from your profile.</p>
                <Button className="mt-5" onClick={() => setLocation("/dashboard/list-product")} data-testid="button-empty-profile-add-product">
                  <Plus className="mr-2 h-4 w-4" /> Add your first product
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const name = product.name?.trim() || "Unnamed product";
                const location = product.farmerLocation?.trim() || "Location not specified";
                const unit = product.unit?.trim() || "unit";
                return (
                  <Card key={product.id} data-testid={`my-profile-product-${product.id}`}>
                    <CardContent className="p-4">
                      <div className="mb-3 aspect-[4/3] overflow-hidden rounded-md bg-muted">
                        <SafeProductImage
                          src={resolveProductImageForProduct(product, { imageOwnership: "seller" }).src}
                          alt={`${name} product image`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold">{name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{safePrice(product)} / {unit}</p>
                        </div>
                        <Badge variant="outline" className="max-w-28 truncate capitalize">{safeCategory(product)}</Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{location}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
                        <Link href={`/products/${product.id}`} className="text-sm font-medium text-primary hover:underline">View listing</Link>
                        <Button variant="outline" size="sm" disabled data-testid={`button-edit-listing-${product.id}`} title="Editing is coming soon">
                          <Edit3 className="mr-2 h-3.5 w-3.5" /> Edit soon
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-6 flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          Owner-only management controls are shown here. Listing edits are intentionally not enabled in this batch.
        </div>
      </main>
    </div>
  );
}
