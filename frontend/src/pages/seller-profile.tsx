import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  MapPin,
  Star,
  Store,
  MessageSquare,
  Heart,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Truck,
} from "lucide-react";
import { TopNavigation } from "@/components/top-navigation";
import { ProductCard } from "@/components/product-card";
import { MapWithNearby } from "@/components/map-with-nearby";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useGoBack } from "@/hooks/use-go-back";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth";
import type { Product } from "@shared/schema";
import { useCurrency } from "@/contexts/currency-context";

export default function SellerProfilePage() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const params = useParams<{ id: string }>();
  const sellerId = params.id || "";

  const [, setLocation] = useLocation();
  const goBack = useGoBack("/");
  const { addItem } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isSellerFavorite, toggleSeller } = useFavorites();

  const { data: sellerData, isLoading: isLoadingSeller, isError: isSellerError } = useQuery<any>({
    queryKey: [`/api/sellers/${sellerId}`],
    enabled: !!sellerId,
  });

  const isOwner =
    user?.id === sellerId ||
    (user?.role === "farmer" && user?.id === sellerData?.id);

  const sellerProducts = useMemo(() => {
    if (!Array.isArray(sellerData?.products)) return [];
    return (sellerData.products as Product[]).filter((product) => product.farmerId === sellerId);
  }, [sellerData, sellerId]);

  const seller = useMemo(() => {
    if (!sellerData?.id) return null;
    const latitude = sellerData.latitude == null ? null : Number(sellerData.latitude);
    const longitude = sellerData.longitude == null ? null : Number(sellerData.longitude);
    const rating = Number(sellerData.rating);
    const reviewCount = Number(sellerData.reviewCount);
    return {
      farmerId: String(sellerData.id),
      farmerName: String(sellerData.name || "Unnamed seller"),
      farmerAvatar: sellerData.avatar ? String(sellerData.avatar) : undefined,
      farmerRating: Number.isFinite(rating) ? rating : 0,
      farmerLocation: sellerData.location ? String(sellerData.location) : "Location not provided",
      farmerLatitude: Number.isFinite(latitude) ? latitude : null,
      farmerLongitude: Number.isFinite(longitude) ? longitude : null,
      farmerIsOnline: sellerData.isOnline === true,
      farmerIsVerified: sellerData.isVerified === true,
      reviewCount: Number.isFinite(reviewCount) ? reviewCount : 0,
    };
  }, [sellerData]);

  const handleAddToCart = (product: Product) => {
    addItem.mutate({ product, quantity: 1 });
  };

  const handleFavoriteSeller = () => {
    if (!seller) return;
    const added = toggleSeller(seller.farmerId);
    if (added === null) {
      toast({
        title: "Sign in to save favorites",
        description: "Favorites are available for your signed-in account only.",
      });
      return;
    }
    toast({
      title: added ? "Seller added to favorites" : "Seller removed from favorites",
    });
  };

  const totalListings = sellerProducts.length;
  const avgPrice =
    totalListings === 0
      ? 0
      : sellerProducts.reduce((s, p) => s + (Number(p.price) || 0), 0) / totalListings;

  if (isLoadingSeller) {
    return (
      <div className="min-h-screen bg-[#f8faf6] dark:bg-background">
        <TopNavigation />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-muted-foreground font-bold animate-pulse">
          {t("common.loading", "Loading Seller Profile...")}
        </div>
      </div>
    );
  }

  if (isSellerError || !seller) {
    return (
      <div className="min-h-screen bg-[#f8faf6] dark:bg-background">
        <TopNavigation />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <Store className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h1 className="text-xl font-black">Verified seller not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This seller is unavailable or does not have an active marketplace verification.
          </p>
          <Button className="mt-5" onClick={goBack}>Back to marketplace</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf6] pb-8 text-foreground dark:bg-background">
      <TopNavigation />

      {/* Top Breadcrumb Header */}
      <div className="border-b bg-white dark:bg-card border-slate-200/80 dark:border-border/60">
        <div className="flex w-full items-center justify-between px-3 py-2 sm:px-4 lg:px-5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-muted"
            onClick={goBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" /> {t("common.back", "Back")}
          </Button>

          <div className="flex items-center gap-2">
            {isOwner ? (
              <Button
                size="sm"
                onClick={() => setLocation("/seller")}
                className="h-8 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs gap-1.5 shadow-2xs"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Seller Hub</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation("/")}
                className="h-8 rounded-xl text-xs font-bold gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Marketplace</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Storefront Banner */}
      <div className="border-b border-slate-200/80 dark:border-border/60 bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/40 dark:from-emerald-950/20 dark:via-card dark:to-amber-950/10">
        <div className="w-full px-3 py-4 sm:px-4 lg:px-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-start gap-3.5 sm:gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 rounded-2xl border-2 border-white bg-white shadow-sm dark:border-card sm:h-20 sm:w-20">
                  <AvatarImage src={seller.farmerAvatar} alt={seller.farmerName} />
                  <AvatarFallback className="text-xl font-black bg-emerald-100 text-emerald-900">
                    {seller.farmerName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {seller.farmerIsOnline && (
                  <span
                    className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white dark:border-card shadow-xs"
                    title="Online now"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1
                    className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight"
                    data-testid="text-seller-name"
                  >
                    {seller.farmerName}
                  </h1>
                  {seller.farmerIsVerified && (
                    <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Verified Producer</span>
                    </Badge>
                  )}
                  {isOwner && (
                    <Badge variant="outline" className="text-[10px] font-bold border-amber-300 bg-amber-50 text-amber-900">
                      Your Storefront
                    </Badge>
                  )}
                </div>

                <p
                  className="text-xs sm:text-sm text-slate-600 dark:text-muted-foreground font-semibold flex items-center gap-1.5"
                  data-testid="text-seller-location"
                >
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{seller.farmerLocation}</span>
                </p>

                <div className="flex items-center gap-3 sm:gap-4 pt-1.5 text-xs sm:text-sm flex-wrap text-slate-600 dark:text-slate-400 font-semibold">
                  <span className="flex items-center gap-1" data-testid="text-seller-rating">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      {seller.farmerRating.toFixed(1)}
                    </span>
                    <span className="text-slate-400">({seller.reviewCount} reviews)</span>
                  </span>
                  <span>·</span>
                  <span data-testid="text-listing-count">
                    <span className="font-black text-slate-900 dark:text-slate-100">{totalListings}</span>{" "}
                    {totalListings === 1 ? "Product" : "Products"}
                  </span>
                  {totalListings > 0 && (
                    <>
                      <span>·</span>
                      <span>
                        Avg. Price:{" "}
                        <span className="font-black text-slate-900 dark:text-slate-100">
                          {format(avgPrice, { includeCode: true })}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                size="sm"
                variant={isSellerFavorite(seller.farmerId) ? "default" : "outline"}
                className="h-9 gap-2 rounded-lg px-3.5 text-xs font-bold shadow-2xs"
                onClick={handleFavoriteSeller}
                data-testid="button-favorite-seller"
              >
                <Heart className={`w-4 h-4 ${isSellerFavorite(seller.farmerId) ? "fill-current" : ""}`} />
                <span>{isSellerFavorite(seller.farmerId) ? "Favorited" : "Favorite"}</span>
              </Button>

              {isOwner ? (
                <Button
                  size="sm"
                  onClick={() => setLocation("/dashboard/photo-sell")}
                  className="h-9 gap-1.5 rounded-lg bg-emerald-800 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-900"
                  data-testid="button-add-listing"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Listing</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "Direct message initiated",
                      description: `Connecting you with ${seller.farmerName}...`,
                    });
                  }}
                  className="h-9 gap-1.5 rounded-lg bg-emerald-800 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-900"
                  data-testid="button-message-seller"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Message Seller</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content & Side Map Grid */}
      <div className="grid w-full grid-cols-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-5">
        <div>
          <Tabs defaultValue="listings" className="space-y-3">
            <TabsList className="h-9 gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-muted">
              <TabsTrigger
                value="listings"
                className="gap-1.5 rounded-lg px-3 py-1 text-xs font-black transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-xs dark:data-[state=active]:bg-card dark:data-[state=active]:text-emerald-400"
                data-testid="tab-all-listings"
              >
                <span>Available Produce</span>
                <span className="text-[10px] bg-slate-200 dark:bg-muted px-2 py-0.5 rounded-full font-bold">
                  {totalListings}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="gap-1.5 rounded-lg px-3 py-1 text-xs font-black transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs dark:data-[state=active]:bg-card dark:data-[state=active]:text-slate-100"
                data-testid="tab-about"
              >
                <span>Store & Farm Details</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="listings" className="mt-0">
              {sellerProducts.length === 0 ? (
                <Card className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-6 text-center shadow-xs dark:border-border/60 dark:bg-card">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                    <Store className="h-6 w-6 opacity-80" />
                  </div>
                  <div className="space-y-1.5 max-w-sm mx-auto">
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                      {isOwner
                        ? "You haven't listed any public products yet"
                        : "No active products listed currently"}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isOwner
                        ? "Start selling by snapping photos of your harvest or entering crop inventory details."
                        : "This verified producer has not published any live listings in this region yet. Check back soon or explore other sellers."}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    {isOwner ? (
                      <>
                        <Button
                          onClick={() => setLocation("/dashboard/photo-sell")}
                          className="rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 shadow-sm gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Photo-Sell Now</span>
                        </Button>
                        <Button
                          onClick={() => setLocation("/seller")}
                          variant="outline"
                          className="rounded-xl font-bold text-xs px-4"
                        >
                          Seller Dashboard
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => setLocation("/")}
                        className="rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-5 shadow-sm"
                      >
                        Explore Marketplace
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                  {sellerProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      compact
                      onAddToCart={handleAddToCart}
                      onClick={(prod) => setLocation(`/products/${prod.id}`)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="about" className="mt-0 space-y-4">
              <Card className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-border/60 dark:bg-card">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Verified Agricultural Producer
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      AgriConnect Identity & Farm Land Records verified
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="font-bold">{seller.farmerName}</span> operates verified direct-to-consumer
                  and wholesale supply operations based out of {seller.farmerLocation}.
                  All harvest and produce batches are monitored for freshness, organic compliance, and secure delivery.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-muted/40 border border-slate-200/60 dark:border-border/40 flex items-center gap-3">
                    <Truck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Direct Farm-Gate & Express Dispatch
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-muted/40 border border-slate-200/60 dark:border-border/40 flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      100% Escrow & Quality Guaranteed
                    </span>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar: Location & Map */}
        <aside className="space-y-3 lg:sticky lg:top-3 lg:self-start">
          <Card className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-border/60 dark:bg-card">
            <div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-border/40">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100">
                  Store Location
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold">
                {seller.farmerLocation}
              </Badge>
            </div>
            <div className="p-1.5">
              {seller.farmerLatitude != null && seller.farmerLongitude != null ? (
                <MapWithNearby
                  products={sellerProducts}
                  center={[seller.farmerLatitude, seller.farmerLongitude]}
                  zoom={12}
                  title={seller.farmerName}
                  subtitle={seller.farmerLocation}
                  mapHeight={230}
                />
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  This seller has not added marketplace map coordinates yet.
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
