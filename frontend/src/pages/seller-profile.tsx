import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Star, Store, Package, MessageSquare, Heart } from "lucide-react";
import { TopNavigation } from "@/components/top-navigation";
import { ProductCard } from "@/components/product-card";
import { MapWithNearby } from "@/components/map-with-nearby";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useGoBack } from "@/hooks/use-go-back";
import { useFavorites } from "@/hooks/use-favorites";
import { PublicSellerBadges } from "@/components/verification-badges";
import type { Product } from "@shared/schema";

export default function SellerProfilePage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const sellerId = params.id;

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const [, setLocation] = useLocation();
  const goBack = useGoBack("/");
  const { addItem } = useCart();
  const { toast } = useToast();
  const { isAuthenticated, isSellerFavorite, toggleSeller } = useFavorites();

  const sellerProducts = useMemo(
    () => products.filter((p) => p.farmerId === sellerId),
    [products, sellerId]
  );

  const handleAddToCart = (product: Product) => {
    addItem.mutate({ product, quantity: 1 });
  };

  const seller = sellerProducts[0];

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
    toast({ title: added ? "Seller added to favorites" : "Seller removed from favorites" });
  };

  if (isLoading) {
    return (
      <div>
        <TopNavigation />
        <div className="p-4 sm:p-8 text-center text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div>
        <TopNavigation />
        <div className="p-4 sm:p-8 text-center">
          <p className="text-lg font-semibold mb-2">{t("seller_profile.description_title")}</p>
          <p className="text-muted-foreground mb-4">{t("seller_profile.no_products_available")}</p>
          <Link href="/">
            <Button variant="outline" data-testid="button-back-home"><ArrowLeft className="w-4 h-4 mr-2" />{t("common.back")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalListings = sellerProducts.length;
  const avgPrice = totalListings === 0 ? 0 : sellerProducts.reduce((s, p) => s + p.price, 0) / totalListings;
  const categories = Array.from(new Set(sellerProducts.map((p) => p.categoryId))).length;

  return (
    <div>
      <TopNavigation />
      <div className="border-b bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={goBack} data-testid="button-back">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {t("common.back")}
          </Button>
        </div>
      </div>

      {/* Hero */}
      <div className="border-b bg-gradient-to-br from-primary/5 to-background">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 border-2 border-background shadow">
              <AvatarImage src={seller.farmerAvatar} alt={seller.farmerName} />
              <AvatarFallback>{seller.farmerName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold" data-testid="text-seller-name">{seller.farmerName}</h1>
                <PublicSellerBadges rating={seller.farmerRating} reviewCount={seller.reviewCount} />
              </div>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1" data-testid="text-seller-location">
                <MapPin className="w-3.5 h-3.5" />
                {seller.farmerLocation || "United Kingdom"}
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1" data-testid="text-seller-rating">
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  <span className="font-semibold">{seller.farmerRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">{t("seller_profile.rating_suffix")}</span>
                </span>
                <span className="text-muted-foreground">·</span>
                <span data-testid="text-listing-count"><span className="font-semibold">{totalListings}</span> {t("seller_profile.product_listings")}</span>
                <span className="text-muted-foreground">·</span>
                <span><span className="font-semibold">{categories}</span> {t("seller_profile.specialties_title")}</span>
                <span className="text-muted-foreground">·</span>
                <span>{t("seller_profile.rating_suffix")} <span className="font-semibold">£{avgPrice.toFixed(2)}</span></span>
              </div>
            </div>
            <Button
              size="icon"
              variant={isSellerFavorite(seller.farmerId) ? "default" : "outline"}
              className="md:hidden shrink-0"
              onClick={handleFavoriteSeller}
              data-testid="button-favorite-seller-mobile"
              aria-label={isSellerFavorite(seller.farmerId) ? "Remove seller from favorites" : "Add seller to favorites"}
              title={isAuthenticated ? (isSellerFavorite(seller.farmerId) ? "Remove from favorites" : "Add to favorites") : "Sign in to save favorites"}
            >
              <Heart className={`w-4 h-4 ${isSellerFavorite(seller.farmerId) ? "fill-current" : ""}`} />
            </Button>
            <div className="hidden md:flex flex-col gap-2">
              <Button
                size="sm"
                variant={isSellerFavorite(seller.farmerId) ? "default" : "outline"}
                className="gap-2"
                onClick={handleFavoriteSeller}
                data-testid="button-favorite-seller"
                title={isAuthenticated ? (isSellerFavorite(seller.farmerId) ? "Remove from favorites" : "Add to favorites") : "Sign in to save favorites"}
              >
                <Heart className={`w-4 h-4 ${isSellerFavorite(seller.farmerId) ? "fill-current" : ""}`} />
                {isSellerFavorite(seller.farmerId) ? "Favorited" : "Favorite"}
              </Button>
              <Button size="sm" className="gap-2" data-testid="button-message-seller">
                <MessageSquare className="w-4 h-4" /> {t("seller_profile.message_button")}
              </Button>
              <Button size="sm" variant="outline" className="gap-2" data-testid="button-follow-seller">
                <Store className="w-4 h-4" /> {t("seller_profile.view_details")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all-listings">
                {t("seller_profile.product_listings")} <Badge variant="secondary" className="ml-2">{totalListings}</Badge>
              </TabsTrigger>
              <TabsTrigger value="about" data-testid="tab-about">{t("seller_profile.description_title")}</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {sellerProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onAddToCart={handleAddToCart}
                    onClick={(prod) => setLocation(`/products/${prod.id}`)}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="about" className="mt-4">
              <Card>
                <CardContent className="p-6 space-y-3 text-sm">
                  <p>
                    <span className="font-semibold">{seller.farmerName}</span> {t("seller_profile.verified_badge")}
                  </p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="w-4 h-4" />
                    {t("seller_profile.standard_delivery")}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right rail: small map showing this seller */}
        <aside>
          <MapWithNearby
            products={sellerProducts}
            center={[seller.farmerLatitude || 54, seller.farmerLongitude || -2.5]}
            zoom={11}
            title={t("seller_profile.location_title")}
            subtitle={seller.farmerName}
            mapHeight={260}
          />
        </aside>
      </div>
    </div>
  );
}
