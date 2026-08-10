import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Star, MapPin, ShoppingCart, Leaf, Check, GitCompareArrows } from "lucide-react";
import { useCompare } from "@/hooks/use-compare";
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
import { FavoriteProductButton } from "./favorite-product-button";
import { useCurrency } from "@/contexts/currency-context";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onWishlist?: (product: Product) => void;
  onClick?: (product: Product) => void;
}

export function ProductCard({
  product,
  onAddToCart,
  onWishlist,
  onClick 
}: ProductCardProps) {
  const [addedToCart, setAddedToCart] = useState(false);
  const { t, i18n } = useTranslation();
  const { format } = useCurrency();
  const { ids: compareIds, toggle: toggleCompare, isFull } = useCompare();
  const { toast: pcToast } = useToast();
  const isComparing = compareIds.includes(product.id);
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
  const formattedPrice = safePrice === null
    ? "Price on request"
    : format(safePrice, {
        sourceCurrency: product.currency || "GBP",
        includeCode: true,
      });

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

  const imageResolution = resolveProductImageForProduct(product);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
    >
      <Card 
        className="overflow-hidden cursor-pointer group transition-all duration-300 border-border/50 hover:border-primary/20 bg-card hover:shadow-xl dark:bg-card/90 dark:border-white/[0.06] dark:hover:border-primary/25 dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(34,197,94,0.08)]"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
        onClick={() => onClick?.(product)}
        data-testid={`card-product-${product.id}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <SafeProductImage src={imageResolution.src} fallbackSrc={imageResolution.fallbackSrc} alt={`${productName} product image`} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-108" />

          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isOrganic && (
              <Badge className="bg-green-600 text-white gap-1 text-[10px] shadow-sm badge-shimmer">
                <Leaf className="h-3 w-3" />
                {t("product.organic", "Organic")}
              </Badge>
            )}
            {product.isFeatured && (
              <Badge variant="secondary" className="text-[10px] shadow-sm badge-shimmer">
                {t("product.featured", "Featured")}
              </Badge>
            )}
          </div>

          <div className="absolute right-2 top-2 flex flex-col gap-1.5">
            <FavoriteProductButton
              productId={product.id}
              productName={productName}
              className="h-8 w-8 border border-background/70 bg-background/95 shadow-md hover:bg-background"
              onToggle={() => onWishlist?.(product)}
              data-testid={`button-wishlist-${product.id}`}
            />
            <Button
              size="icon"
              variant="secondary"
              className={`transition-all shadow-md h-8 w-8 ${
                isComparing
                  ? 'opacity-100 bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'opacity-0 group-hover:opacity-100 bg-background/90 hover:bg-background'
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
          </div>
        </div>

        <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-black text-base sm:text-lg md:text-xl leading-tight line-clamp-2 flex-1 text-foreground group-hover:text-primary transition-colors tracking-tight" data-testid={`text-product-name-${product.id}`}>
                {productName}
              </h3>
              <TextToSpeech text={`${productName}. Price: ${formattedPrice} per ${safeUnit}. Sold by ${sellerName}.`} />
            </div>

            {!shouldAutoTranslate && <TranslateButton text={descText} className="mb-2" />}

            <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
              <Link
                href={product.farmerId ? `/sellers/${product.farmerId}` : "#"}
                className="flex min-w-0 items-center gap-2 hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
                data-testid={`link-seller-${product.farmerId}`}
              >
                <Avatar className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 ring-2 ring-primary/30">
                  <AvatarImage src={product.farmerAvatar || undefined} alt={sellerName} />
                  <AvatarFallback className="text-[10px] font-black bg-primary/20 text-primary">
                    {sellerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs sm:text-sm font-black text-foreground/90 truncate hover:underline">
                  {sellerName}
                </span>
              </Link>
              <PublicSellerBadges rating={product.farmerRating} reviewCount={product.reviewCount} />
            </div>

            <div className="flex items-center gap-3 mb-2 text-xs sm:text-sm font-bold">
              <div className="flex items-center gap-1 bg-amber-400/20 border border-amber-400/50 px-2 py-0.5 rounded-lg shadow-2xs">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                <span className="font-black text-foreground">{safeRating.toFixed(1)}</span>
                <span className="text-muted-foreground font-bold">({safeReviewCount})</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground truncate font-black">
                <MapPin className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">{Number.isFinite(product.distance) ? `${product.distance!.toFixed(1)}km` : "Location not specified"}</span>
              </div>
            </div>

            {product.dietaryTags && product.dietaryTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {product.dietaryTags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs px-2.5 py-0.5 h-6 border-primary/40 text-primary font-black bg-primary/10 rounded-lg"
                  >
                    {tag}
                  </Badge>
                ))}
                {product.dietaryTags.length > 2 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 h-6 border-border/60 text-muted-foreground font-extrabold rounded-lg">
                    +{product.dietaryTags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t-2 border-border/60 mt-auto space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="inline-flex items-baseline flex-wrap min-w-0">
                <span className="text-xl sm:text-2xl font-black tracking-tight font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap" data-testid={`text-product-price-${product.id}`}>
                  {formattedPrice}
                </span>
                {safePrice !== null && <span className="text-xs sm:text-sm text-muted-foreground font-black ml-1 whitespace-nowrap">/{safeUnit}</span>}
              </div>
              <Badge
                variant={safeStock > 20 ? "secondary" : "destructive"}
                className="text-xs font-black px-3 py-1 rounded-lg shadow-2xs shrink-0"
              >
                {safeStock > 0 ? `${safeStock}` : t("product.out_short")}
              </Badge>
            </div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                className="w-full gap-2 h-10 sm:h-11 text-xs sm:text-sm font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-md rounded-xl border border-amber-500/40"
                onClick={handleAddToCart}
                disabled={safeStock <= 0 || addedToCart}
                data-testid={`button-add-to-cart-${product.id}`}
              >
                {addedToCart ? (
                  <>
                    <Check className="h-4.5 w-4.5 text-black" />
                    {t("product.added", "Added")}
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4.5 w-4.5 text-black" />
                    <span>{t("product.add_to_cart", "Add to Cart")}</span>
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
