import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Star, MapPin, Heart, ShoppingCart, Leaf, Check, GitCompareArrows } from "lucide-react";
import { useCompare } from "@/hooks/use-compare";
import { useFavorites } from "@/hooks/use-favorites";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TextToSpeech } from "./text-to-speech";
import { TranslateButton } from "./translate-button";
import type { Product } from "@shared/schema";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { resolveProductImageForProduct } from "@/lib/product-images";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SafeProductImage } from "./safe-product-image";
import { PublicSellerBadges } from "./verification-badges";

interface ProductCardProps {
  product: Product;
  currencySymbol?: string;
  onAddToCart?: (product: Product) => void;
  onWishlist?: (product: Product) => void;
  onClick?: (product: Product) => void;
}

export function ProductCard({ 
  product, 
  currencySymbol = "£", 
  onAddToCart, 
  onWishlist,
  onClick 
}: ProductCardProps) {
  const [addedToCart, setAddedToCart] = useState(false);
  const { t, i18n } = useTranslation();
  const { ids: compareIds, toggle: toggleCompare, isFull } = useCompare();
  const { isAuthenticated, isProductFavorite, toggleProduct } = useFavorites();
  const { toast: pcToast } = useToast();
  const isComparing = compareIds.includes(product.id);
  const isWishlisted = isProductFavorite(product.id);
  const [autoTranslateOn, setAutoTranslateOn] = useState(() => localStorage.getItem("agriconnect-auto-translate") === "true");
  const baseLang = i18n.language.split("-")[0];

  useEffect(() => {
    const handler = (e: Event) => setAutoTranslateOn((e as CustomEvent).detail);
    window.addEventListener("auto-translate-changed", handler);
    return () => window.removeEventListener("auto-translate-changed", handler);
  }, []);

  const shouldAutoTranslate = autoTranslateOn && baseLang !== "en";
  const productName = product.name?.trim() || "Unnamed product";
  const sellerName = product.farmerName?.trim() || "Seller not specified";
  const safePrice = Number.isFinite(product.price) ? product.price : null;
  const safeStock = Number.isFinite(product.stock) ? product.stock : 0;
  const safeRating = Number.isFinite(product.rating) ? product.rating : 0;
  const safeReviewCount = Number.isFinite(product.reviewCount) ? product.reviewCount : 0;
  const safeUnit = product.unit?.trim() || "unit";
  const descText = product.description || productName;

  const { data: translatedDesc } = useQuery({
    queryKey: ["/api/ai/translate", descText, baseLang],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/ai/translate", {
        text: descText,
        targetLanguage: baseLang,
        context: "agricultural marketplace product description",
      });
      const data = await res.json();
      return data.translated as string;
    },
    enabled: shouldAutoTranslate,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  });

  const displayDesc = shouldAutoTranslate && translatedDesc ? translatedDesc : descText;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAddedToCart(true);
    onAddToCart?.(product);
    setTimeout(() => setAddedToCart(false), 1500);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    const added = toggleProduct(product.id);
    if (added === null) {
      pcToast({
        title: "Sign in to save favorites",
        description: "Favorites are available for your signed-in account only.",
      });
      return;
    }
    onWishlist?.(product);
    pcToast({ title: added ? "Added to favorites" : "Removed from favorites" });
  };

  const imageResolution = resolveProductImageForProduct(product);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
    >
      <Card 
        className="overflow-hidden cursor-pointer group transition-all duration-300 border-border/50 hover:border-primary/20 bg-card/80 backdrop-blur-sm hover:shadow-xl dark:bg-card/70 dark:border-white/[0.06] dark:hover:border-primary/25 dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(34,197,94,0.08)]"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
        onClick={() => onClick?.(product)}
        data-testid={`card-product-${product.id}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <SafeProductImage src={imageResolution.src} fallbackSrc={imageResolution.fallbackSrc} alt={`${productName} product image`} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-108" />

          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isOrganic && (
              <Badge className="bg-green-600/90 backdrop-blur-sm text-white gap-1 text-[10px] shadow-sm badge-shimmer">
                <Leaf className="h-3 w-3" />
                {t("product.organic", "Organic")}
              </Badge>
            )}
            {product.isFeatured && (
              <Badge variant="secondary" className="text-[10px] backdrop-blur-sm shadow-sm badge-shimmer">
                {t("product.featured", "Featured")}
              </Badge>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute top-2 right-2 flex flex-col gap-1.5"
          >
            <Button
              size="icon"
              variant="secondary"
              className={`opacity-0 group-hover:opacity-100 transition-all bg-background/80 backdrop-blur-sm hover:bg-background shadow-md h-8 w-8 ${isWishlisted ? 'opacity-100 text-red-500' : ''}`}
              onClick={handleWishlist}
              data-testid={`button-wishlist-${product.id}`}
              aria-label={isWishlisted ? `Remove ${productName} from favorites` : `Add ${productName} to favorites`}
              title={isAuthenticated ? (isWishlisted ? "Remove from favorites" : "Add to favorites") : "Sign in to save favorites"}
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className={`transition-all backdrop-blur-sm shadow-md h-8 w-8 ${
                isComparing
                  ? 'opacity-100 bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'opacity-0 group-hover:opacity-100 bg-background/80 hover:bg-background'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isComparing && isFull) {
                  pcToast({ title: t("compare.list_full"), description: t("compare.list_full_desc"), variant: "destructive" });
                  return;
                }
                const added = toggleCompare(product.id);
                pcToast({ title: added ? t("compare.added") : t("compare.removed") });
              }}
              title={isComparing ? t("compare.remove_title") : t("compare.add_title")}
              data-testid={`button-compare-${product.id}`}
            >
              <GitCompareArrows className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>

        <CardContent className="p-2 sm:p-3">
          <div className="flex items-start justify-between gap-1 mb-1">
            <h3 className="font-semibold text-[11px] sm:text-sm leading-tight line-clamp-2 flex-1 group-hover:text-primary transition-colors" data-testid={`text-product-name-${product.id}`}>
              {productName}
            </h3>
            <TextToSpeech text={`${productName}. Price: ${safePrice === null ? "Price on request" : `${currencySymbol}${safePrice}`} per ${safeUnit}. Sold by ${sellerName}.`} />
          </div>

          {!shouldAutoTranslate && <TranslateButton text={descText} className="mb-1" />}

          <div className="mb-1 flex items-center gap-1">
            <Link
              href={product.farmerId ? `/sellers/${product.farmerId}` : "#"}
              className="flex min-w-0 items-center gap-1 hover:text-primary"
              onClick={(e) => e.stopPropagation()}
              data-testid={`link-seller-${product.farmerId}`}
            >
              <Avatar className="h-4 w-4 shrink-0">
                <AvatarImage src={product.farmerAvatar || undefined} alt={sellerName} />
                <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                  {sellerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[9px] sm:text-[11px] text-muted-foreground truncate hover:underline">
                {sellerName}
              </span>
            </Link>
            <PublicSellerBadges rating={product.farmerRating} reviewCount={product.reviewCount} />
          </div>

          <div className="flex items-center gap-1.5 mb-1 text-[9px] sm:text-[11px]">
            <div className="flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{safeRating.toFixed(1)}</span>
              <span className="text-muted-foreground hidden sm:inline">({safeReviewCount})</span>
            </div>
            <div className="flex items-center gap-0.5 text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" />
              <span>{Number.isFinite(product.distance) ? `${product.distance!.toFixed(1)}km` : "Location not specified"}</span>
            </div>
          </div>
          
          {product.dietaryTags && product.dietaryTags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 sm:gap-1 mb-1 sm:mb-2">
              {product.dietaryTags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[8px] sm:text-[9px] px-1 py-0 h-3.5 sm:h-4 border-primary/30 text-primary/80"
                >
                  {tag}
                </Badge>
              ))}
              {product.dietaryTags.length > 2 && (
                <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 py-0 h-3.5 sm:h-4 border-border/50 text-muted-foreground">
                  +{product.dietaryTags.length - 2}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <div>
              <span className="text-sm sm:text-lg font-bold tracking-tight font-mono" data-testid={`text-product-price-${product.id}`}>
                {safePrice === null ? "Price on request" : `${currencySymbol}${safePrice}`}
              </span>
              {safePrice !== null && <span className="text-[9px] sm:text-[11px] text-muted-foreground">/{safeUnit}</span>}
            </div>
            <Badge 
              variant={safeStock > 20 ? "secondary" : "destructive"} 
              className="text-[8px] sm:text-[10px] font-mono"
            >
              {safeStock > 0 ? `${safeStock}` : t("product.out_short")}
            </Badge>
          </div>

          <motion.div whileTap={{ scale: 0.97 }}>
            <Button 
              className="w-full gap-1 h-7 sm:h-8 text-[10px] sm:text-[11px] font-bold uppercase tracking-tight transition-all btn-glow"
              onClick={handleAddToCart}
              disabled={safeStock <= 0 || addedToCart}
              data-testid={`button-add-to-cart-${product.id}`}
            >
              {addedToCart ? (
                <>
                  <Check className="h-3 w-3" />
                  {t("product.added", "Added")}
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3 w-3" />
                  <span className="hidden sm:inline">{t("product.add_to_cart", "Add to Cart")}</span>
                  <span className="sm:hidden">{t("product.add_short")}</span>
                </>
              )}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
