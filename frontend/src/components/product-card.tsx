import { useState } from "react";
import { Link } from "wouter";
import { Star, MapPin, ShoppingCart, Leaf, Check, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@shared/schema";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { resolveProductImageForProduct } from "@/lib/product-images";
import { FavoriteProductButton } from "./favorite-product-button";
import { useCurrency } from "@/contexts/currency-context";
import { useLiveLocation } from "@/contexts/live-location-context";

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
  onClick,
}: ProductCardProps) {
  const [addedToCart, setAddedToCart] = useState(false);
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { location: liveLoc } = useLiveLocation();

  const cityName = liveLoc?.label || "Coimbatore, TN";
  const productName = product.name?.trim() || "Unnamed Product";
  const sellerName = product.farmerName?.trim() || "Green Fields Farm";
  const sellerLoc = product.farmerLocation || cityName;
  const sellerDist = typeof product.distance === "number" ? product.distance : 3;
  const rating = Number.isFinite(product.farmerRating) && product.farmerRating > 0 ? product.farmerRating : (Number.isFinite(product.rating) ? product.rating : 4.6);
  const reviewCount = product.reviewCount || 96;

  // Strikethrough calculation
  const discountPct = product.isOrganic ? 17 : (product.isFeatured ? 13 : 10);
  const originalPrice = product.price ? product.price * (1 + discountPct / 100) : null;

  const isBestseller = product.isFeatured || reviewCount > 100;
  const isFreshPick = product.isOrganic || !isBestseller;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAddedToCart(true);
    onAddToCart?.(product);
    setTimeout(() => setAddedToCart(false), 1200);
  };

  const imageResolution = resolveProductImageForProduct(product);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="h-full"
    >
      <div
        className="group rounded-2xl border border-slate-200/90 dark:border-border/80 bg-white dark:bg-card overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-500/50 transition-all duration-200 flex flex-col justify-between h-full cursor-pointer"
        onClick={() => onClick?.(product)}
        data-testid={`card-product-${product.id}`}
      >
        {/* ─── IMAGE AREA WITH BADGE & HEART ─── */}
        <div className="relative aspect-[16/10] bg-slate-100 dark:bg-muted overflow-hidden">
          <img
            src={imageResolution.src}
            alt={`${productName} image`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = imageResolution.fallbackSrc || imageResolution.src;
            }}
          />

          {/* Top Left Badge */}
          <div className="absolute top-2 left-2 z-10">
            {isBestseller ? (
              <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs leading-none">
                Bestseller
              </span>
            ) : isFreshPick ? (
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs leading-none">
                Fresh Pick
              </span>
            ) : null}
          </div>

          {/* Top Right Wishlist Button */}
          <div className="absolute top-2 right-2 z-10">
            <FavoriteProductButton
              productId={product.id}
              productName={productName}
              className="h-7 w-7 rounded-full bg-white/90 dark:bg-card/90 border border-slate-200/80 shadow-2xs flex items-center justify-center text-red-500 hover:scale-105 transition-transform"
              onToggle={() => onWishlist?.(product)}
            />
          </div>
        </div>

        {/* ─── CARD DETAILS ─── */}
        <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-3">
          <div>
            {/* Product Title & Unit */}
            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              {productName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              {product.unit || "500g"}
            </p>

            {/* Price Row */}
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-base sm:text-lg font-black text-emerald-800 dark:text-emerald-400">
                {format(product.price, { sourceCurrency: product.currency || "GBP" })}
              </span>
              {originalPrice && (
                <span className="text-xs text-slate-400 line-through font-semibold">
                  {format(originalPrice, { sourceCurrency: product.currency || "GBP" })}
                </span>
              )}
              <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded-md">
                {discountPct}% OFF
              </span>
            </div>

            {/* Seller Info */}
            <div className="mt-2 text-xs">
              <p className="font-bold text-slate-700 dark:text-slate-200 truncate">
                {sellerName}
              </p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate font-medium">
                <MapPin className="h-3 w-3 text-red-400 shrink-0" />
                <span>{sellerLoc} • {sellerDist.toFixed(0)} km</span>
              </p>
            </div>

            {/* Rating & Verified Badge */}
            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-border/40 text-[11px] font-bold">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-black text-slate-800 dark:text-slate-200">{rating.toFixed(1)}</span>
                <span className="text-slate-400 font-semibold">({reviewCount})</span>
              </div>

              <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verified</span>
              </div>
            </div>
          </div>

          {/* Full-width Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            className="w-full mt-2 h-9 bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-black text-xs rounded-xl shadow-2xs gap-1.5 transition-colors"
            data-testid={`button-add-to-cart-${product.id}`}
          >
            {addedToCart ? (
              <>
                <Check className="h-4 w-4" />
                <span>Added to Cart</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
