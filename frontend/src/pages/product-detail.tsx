import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, MapPin, ShoppingCart, Share2, Truck, Shield,
  Leaf, ChevronLeft, ChevronRight, Package, Clock, BadgeCheck,
  Plus, Minus, ThumbsUp, MessageSquare, Zap, BarChart3, Award,
  ArrowLeft, Check, ChevronDown, ChevronUp, Info, Loader2, CheckCircle, Lock,
  Tag, Globe, Wheat, Sprout, Snowflake, Calendar, Recycle, Tractor, Repeat
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Review } from "@shared/schema";
import { TopNavigation } from "@/components/top-navigation";
import { SafeProductImage } from "@/components/safe-product-image";
import { resolveProductImageForProduct } from "@/lib/product-images";
import { FavoriteProductButton } from "@/components/favorite-product-button";
import { useCatalogCategories } from "@/hooks/use-catalog-categories";
import {
  buildCategoryBrowseUrl,
  buildProductDetailUrl,
  getProductBrowseContext,
} from "@/lib/product-navigation";
import { useCurrency } from "@/contexts/currency-context";
import { ProductConversation } from "@/components/product-conversation";

const REVIEWER_NAMES = [
  "Priya Sharma", "James O'Brien", "Mei Lin", "Tariq Hassan", "Sophie Adeyemi",
  "David Chen", "Fatima Al-Rashid", "Tom Whitfield", "Ananya Patel", "Carlos Mendes",
  "Grace Okonkwo", "Liam Murphy", "Aisha Nkosi", "Felix Wagner", "Yuki Tanaka"
];

const REVIEW_COMMENTS: Record<number, string[]> = {
  5: [
    "Absolutely outstanding quality! Fresh, vibrant and exactly as described. Will definitely order again.",
    "Best produce I've had in years. The farmer clearly takes pride in what they grow.",
    "Exceeded all expectations. Arrived perfectly packaged, flavour is incredible.",
    "Top-notch quality, very fresh. My family loved it. Highly recommend!"
  ],
  4: [
    "Really good quality overall. A couple of pieces were slightly smaller than expected but taste is great.",
    "Very fresh and well packed. Delivery was prompt. Would buy again.",
    "Good product, taste is very natural and organic. Happy with my purchase.",
    "Solid quality. The flavour is authentic and the packaging was secure."
  ],
  3: [
    "Decent quality but a bit inconsistent in size. Taste is good though.",
    "Average. Some pieces were great, others not so much. Price is fair.",
    "Okay product. Nothing special but does what it says on the tin.",
    "Mixed bag — some excellent, some not. Would try again with hopes it improves."
  ],
  2: [
    "Not quite what I expected. The quality was below what the photos suggested.",
    "Disappointed with this order. A few pieces had bruising.",
  ]
};

function generateReviews(product: Product) {
  const count = Math.min(product.reviewCount, 8);
  const rating = product.rating;
  const reviews = [];
  const usedNames = new Set<number>();

  for (let i = 0; i < count; i++) {
    let nameIdx;
    do { nameIdx = Math.floor(Math.random() * REVIEWER_NAMES.length); } while (usedNames.has(nameIdx));
    usedNames.add(nameIdx);

    const starRoll = Math.random();
    let stars: number;
    if (starRoll < 0.5) stars = Math.round(rating);
    else if (starRoll < 0.75) stars = Math.min(5, Math.round(rating) + 1);
    else stars = Math.max(1, Math.round(rating) - 1);
    stars = Math.max(1, Math.min(5, stars));

    const comments = REVIEW_COMMENTS[stars] || REVIEW_COMMENTS[3];
    const comment = comments[Math.floor(Math.random() * comments.length)];

    const daysAgo = Math.floor(Math.random() * 60) + 1;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    reviews.push({
      id: i,
      name: REVIEWER_NAMES[nameIdx],
      stars,
      comment,
      date: date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      helpful: Math.floor(Math.random() * 40),
      verified: Math.random() > 0.3,
    });
  }

  return reviews.sort((a, b) => b.stars - a.stars);
}

function getRatingBreakdown(rating: number, count: number) {
  const base = [0.55, 0.25, 0.12, 0.05, 0.03];
  const offset = (rating - 3.5) * 0.1;
  return [5, 4, 3, 2, 1].map((star, i) => ({
    star,
    pct: Math.max(0, Math.min(100, Math.round((base[i] + (i < 2 ? offset : -offset / 3)) * 100))),
    count: Math.round((base[i] + (i < 2 ? offset : -offset / 3)) * count),
  }));
}

export default function ProductDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { format } = useCurrency();
  const { data: publishedCategories = [] } = useCatalogCategories("buyer");
  const { user, isAuthenticated } = useAuth();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewHover, setReviewHover] = useState(0);
  const [purchaseMode, setPurchaseMode] = useState<"one-time" | "subscribe">("one-time");
  const [subFrequency, setSubFrequency] = useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [isAddingBundle, setIsAddingBundle] = useState(false);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", id],
    queryFn: async () => {
      const r = await fetch(`/api/products/${id}`);
      if (!r.ok) throw new Error("Product not found");
      return r.json();
    },
    enabled: !!id,
    retry: false,
  });

  const { data: relatedProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/farmers", product?.farmerId, "products"],
    queryFn: async () => {
      const r = await fetch(`/api/farmers/${product!.farmerId}/products`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!product?.farmerId,
  });

  // Category-based recommendations (similar products from any seller).
  const { data: categoryRecs = [] } = useQuery<Product[]>({
    queryKey: [product?.categoryId
      ? `/api/products?categoryId=${product.categoryId}${product.subcategoryId ? `&subcategoryId=${product.subcategoryId}` : ""}`
      : "/api/products"],
    enabled: !!product?.categoryId,
  });
  const recommended = categoryRecs.filter(p => p.id !== product?.id).slice(0, 8);

  const addToCartMutation = useMutation({
    mutationFn: (qty: number) => {
      return apiRequest("POST", "/api/cart", {
        productId: id,
        quantity: qty,
        unitPrice: effectiveUnitPrice,
        purchaseMode,
        ...(purchaseMode === "subscribe" ? { subFrequency } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      setAddedToCart(true);
      toast({ title: t("product_detail.add_to_cart"), description: `${quantity} × ${product?.name}` });
      setTimeout(() => setAddedToCart(false), 2000);
    },
    onError: (err: any) => {
      toast({
        title: t("product_detail.out_of_stock"),
        description: err?.message || t("product_detail.loading"),
        variant: "destructive",
      });
    },
  });

  const { data: realReviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/reviews/product", id],
    queryFn: () => fetch(`/api/reviews/product/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: reviewEligibility } = useQuery<{ canReview: boolean; hasReviewed: boolean; orderId?: string }>({
    queryKey: ["/api/reviews/check", id],
    queryFn: () => fetch(`/api/reviews/check/${id}`, { credentials: "include" }).then((r) => r.json()),
    enabled: !!id && isAuthenticated,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reviews", {
        productId: id,
        orderId: reviewEligibility?.orderId,
        rating: reviewRating,
        comment: reviewComment,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/product", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/check", id] });
      setShowReviewForm(false);
      setReviewComment("");
      setReviewRating(5);
      toast({ title: t("product_detail.reviews_title"), description: t("common.loading") });
    },
    onError: (e: any) => {
      toast({ title: t("product_detail.no_reviews_yet"), description: e.message, variant: "destructive" });
    },
  });

  const fallbackProductImageResolution = product
    ? resolveProductImageForProduct(product)
    : null;
  const fallbackProductImage = fallbackProductImageResolution?.src ?? "";
  const allImages = product
    ? [fallbackProductImage]
    : [];

  const reviews = product ? generateReviews(product) : [];
  const breakdown = product ? getRatingBreakdown(product.rating, product.reviewCount) : [];

  const getImg = (idx: number) =>
    imageError[idx]
      ? fallbackProductImage
      : allImages[idx] || fallbackProductImage;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 animate-pulse">
            <div className="space-y-3">
              <div className="aspect-square rounded-2xl bg-muted" />
              <div className="flex gap-2">{[0,1,2,3].map(i => <div key={i} className="w-20 h-20 rounded-lg bg-muted" />)}</div>
            </div>
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-5 bg-muted rounded w-1/3" />
              <div className="h-12 bg-muted rounded w-1/2" />
              <div className="h-24 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground text-lg">{t("product_detail.breadcrumb_products")}</p>
          <Button onClick={() => setLocation("/")} variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />{t("product_detail.breadcrumb_home")}</Button>
        </div>
      </div>
    );
  }

  const discount = product.isFeatured ? Math.floor(Math.random() * 15) + 8 : 0;
  const originalPrice = discount > 0 ? (product.price * (1 + discount / 100)).toFixed(2) : null;

  // F.9 — Bulk pricing tiers
  const BULK_TIERS = [
    { min: 1,   max: 9,    discountPct: 0,  label: "1–9" },
    { min: 10,  max: 49,   discountPct: 10, label: "10–49" },
    { min: 50,  max: 199,  discountPct: 18, label: "50–199" },
    { min: 200, max: 9999, discountPct: 25, label: "200+" },
  ];
  const currentTier = BULK_TIERS.find(t => quantity >= t.min && quantity <= t.max) ?? BULK_TIERS[0];
  const bulkUnitPrice = +(product.price * (1 - currentTier.discountPct / 100)).toFixed(2);

  // F.10 — Subscribe & Save
  const SUBSCRIBE_DISCOUNT_PCT = 10;
  const FREQUENCY_LABELS = { weekly: "Every week", biweekly: "Every 2 weeks", monthly: "Every month" };
  const subUnitPrice = +(bulkUnitPrice * (1 - SUBSCRIBE_DISCOUNT_PCT / 100)).toFixed(2);

  const effectiveUnitPrice = purchaseMode === "subscribe" ? subUnitPrice : bulkUnitPrice;
  const lineTotal = +(effectiveUnitPrice * quantity).toFixed(2);
  const baseLineTotal = +(product.price * quantity).toFixed(2);
  const totalSaved = +(baseLineTotal - lineTotal).toFixed(2);
  const browseContext = getProductBrowseContext(search, product);
  const categoryReturnUrl = buildCategoryBrowseUrl(browseContext);
  const categoryLabel =
    publishedCategories.find((category) => category.id === browseContext.categoryId)?.name ||
    browseContext.categoryId.replace(/-/g, " ");
  const relatedProductUrl = (relatedProduct: Product) =>
    buildProductDetailUrl(relatedProduct, browseContext);
  const money = (amount: number, includeCode = false) =>
    format(amount, {
      sourceCurrency: product.currency || "GBP",
      includeCode,
    });

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation onBack={() => setLocation(categoryReturnUrl)} />

      <div className="w-full max-w-[1480px] mx-auto px-3 sm:px-6 pt-3 sm:pt-6 pb-36 md:pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-6 font-bold">
          <button
            onClick={() => setLocation(categoryReturnUrl)}
            className="flex items-center gap-1.5 font-bold capitalize transition-colors hover:text-primary"
            data-testid="button-back-to-category"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {categoryLabel}
          </button>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-foreground font-black truncate max-w-sm">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr_360px] xl:grid-cols-[480px_1fr_380px] gap-6 xl:gap-8">
          {/* LEFT: Image Gallery */}
          <div className="space-y-3">
            {/* Main image */}
            <motion.div
              className="relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border/50"
              key={selectedImage}
              initial={{ opacity: 0.7, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <SafeProductImage
                src={getImg(selectedImage)}
                fallbackSrc={fallbackProductImageResolution?.fallbackSrc}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.isOrganic && (
                <div className="absolute top-4 left-4">
                  <Badge className="bg-green-600 text-white gap-1.5 px-3 py-1.5 text-sm shadow-lg">
                    <Leaf className="h-3.5 w-3.5" />Organic Certified
                  </Badge>
                </div>
              )}
              {product.isFeatured && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-amber-500 text-white gap-1.5 px-3 py-1.5 text-sm shadow-lg">
                    <Award className="h-3.5 w-3.5" />Featured
                  </Badge>
                </div>
              )}
              {/* Image nav arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage(p => (p - 1 + allImages.length) % allImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 shadow-md hover:bg-background transition-all border border-border/40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSelectedImage(p => (p + 1) % allImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 shadow-md hover:bg-background transition-all border border-border/40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
              {/* Dot indicator */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {allImages.map((_, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === selectedImage ? "bg-white scale-125 shadow" : "bg-white/50"}`}
                  />
                ))}
              </div>
            </motion.div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-none w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${i === selectedImage ? "border-primary shadow-md shadow-primary/20" : "border-border/40 hover:border-primary/40"}`}
                  >
                    <SafeProductImage
                      src={getImg(i)}
                      fallbackSrc={fallbackProductImageResolution?.fallbackSrc}
                      alt={`View ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div className={`grid gap-2 mt-2 ${product.farmerIsVerified ? "grid-cols-3" : "grid-cols-2"}`}>
              {[
                ...(product.farmerIsVerified ? [{ icon: Shield, label: t("product_detail.verified_seller"), color: "text-blue-500" }] : []),
                { icon: Truck, label: t("product_detail.standard_delivery"), color: "text-green-500" },
                { icon: Package, label: t("product_detail.freshness_guarantee"), color: "text-amber-500" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex flex-col items-center gap-1 bg-muted/50 rounded-xl p-3 text-center border border-border/30">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <span className="text-[11px] text-muted-foreground font-medium leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* MIDDLE: Product Info — name, rating, price, About-this-item bullets, highlight icons, seller card */}
          <div className="space-y-4 min-w-0">
            {/* Brand / sold-by line */}
            <div className="flex items-center gap-2 text-xs">
              <a href="#seller" className="text-primary hover:underline font-medium" data-testid="link-brand">
                {t("product_detail.specs_brand")}: {product.farmerName}
              </a>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground capitalize">{(product.categoryId || "").replace(/-/g, " ")}</span>
            </div>

            {/* Name + share */}
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight text-foreground" data-testid="text-product-detail-name">
                {product.name}
              </h1>
              <button
                onClick={() => { navigator.clipboard?.writeText(window.location.href); toast({ title: "Link copied!" }); }}
                className="flex-none p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-border/40"
                data-testid="button-share"
              >
                <Share2 className="h-5 w-5 text-foreground/80" />
              </button>
            </div>

            {/* Rating row */}
            <div className="flex items-center flex-wrap gap-2.5 -mt-1">
              <span className="text-base font-black text-amber-600 dark:text-amber-400">{product.rating.toFixed(1)}</span>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`h-4.5 w-4.5 ${s <= Math.round(product.rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`} />
                ))}
              </div>
              <a href="#reviews" className="text-sm font-bold text-primary hover:underline underline-offset-2" data-testid="link-reviews">
                {product.reviewCount.toLocaleString()} ratings
              </a>
              <span className="text-muted-foreground text-sm">|</span>
              <span className="text-sm font-bold text-foreground">{product.stock > 0 ? `${product.stock} ${product.unit} ${t("product_detail.in_stock")}` : t("product_detail.out_of_stock")}</span>
            </div>

            {/* Trust strip — Climate Pledge / Organic / Verified */}
            <div className="flex flex-wrap items-center gap-2">
              {product.isOrganic && (
                <Badge className="bg-green-500/15 text-green-800 dark:text-green-300 border border-green-500/30 gap-1.5 px-3 py-1 text-xs font-black" data-testid="badge-organic">
                  <Leaf className="h-3.5 w-3.5" />{t("product_detail.specs_organic_certified")}
                </Badge>
              )}
              <Badge className="bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30 gap-1.5 px-3 py-1 text-xs font-black">
                <Recycle className="h-3.5 w-3.5" />Climate Pledge Friendly
              </Badge>
              <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 gap-1.5 px-3 py-1 text-xs font-black">
                <BadgeCheck className="h-3.5 w-3.5" />Verified Farm
              </Badge>
              {product.isFeatured && (
                <Badge className="bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 gap-1.5 px-3 py-1 text-xs font-black">
                  <Award className="h-3.5 w-3.5" />Amazon's Choice
                </Badge>
              )}
            </div>

            <Separator />

            {/* Price block */}
            <div className="space-y-1.5">
              {originalPrice && (
                <div className="text-sm font-bold text-muted-foreground">
                  RRP: <span className="line-through">{money(Number(originalPrice), true)}</span>
                </div>
              )}
              <div className="flex items-baseline gap-3 flex-wrap">
                {discount > 0 && (
                  <span className="text-2xl font-black text-red-600">-{discount}%</span>
                )}
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground" data-testid="text-product-detail-price">
                  {money(product.price, true)}
                </span>
                <span className="text-base font-bold text-muted-foreground">/{product.unit}</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-muted-foreground">{t("product_detail.quality_assurance_1")}</div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm pt-1">
                <Leaf className="h-4 w-4 text-green-600" />
                <span className="text-green-700 dark:text-green-400 font-extrabold">{t("product_detail.quality_assurance_2")}</span>
              </div>
            </div>

            {/* PRODUCT HIGHLIGHTS — Amazon-style icon grid (the F.7 signature feature) */}
            <div className="grid grid-cols-3 gap-3 py-4 px-1 border-y border-border/60" data-testid="grid-product-highlights">
              {[
                { icon: Globe, label: t("product_detail.specs_certifications"), value: product.farmerLocation?.split(",")[0] || "Not provided" },
                { icon: product.isOrganic ? Sprout : Wheat, label: t("product_detail.specs_category"), value: product.isOrganic ? "Organic" : "Conventional" },
                { icon: Tag, label: t("product_detail.specs_brand"), value: (product.farmerName || "Farm").split(" ")[0] },
                { icon: Package, label: t("product_detail.specs_sku"), value: product.unit },
                { icon: Snowflake, label: t("product_detail.specs_weight"), value: "Cool/Dry" },
                { icon: Tractor, label: t("product_detail.specs_model"), value: "< 48 hrs" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col items-center text-center gap-1.5 p-2.5 rounded-xl bg-muted/40 border border-border/50 shadow-2xs" data-testid={`highlight-${label.toLowerCase()}`}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="text-xs font-black text-muted-foreground uppercase tracking-wide leading-none">{label}</div>
                  <div className="text-xs sm:text-sm font-black text-foreground leading-tight line-clamp-1">{value}</div>
                </div>
              ))}
            </div>

            {/* ABOUT THIS ITEM — Amazon-style bullets */}
            <div className="space-y-2">
              <h3 className="text-base font-bold">{t("product_detail.specs_title")}</h3>
              <ul className="space-y-1.5 text-sm text-foreground/85 list-disc pl-5 marker:text-muted-foreground">
                {[
                  `${product.isOrganic ? "Organically grown" : "Sustainably grown"} by ${product.farmerName} in ${product.farmerLocation}.`,
                  `Harvested at peak freshness and shipped within 48 hours — no cold-chain compromise.`,
                  `Sold per ${product.unit}; current stock ${product.stock} ${product.unit}${product.stock > 1 ? "s" : ""} available.`,
                  `${product.dietaryTags && product.dietaryTags.length > 0 ? `Suitable for: ${product.dietaryTags.join(", ")}.` : "Naturally grown with no artificial additives."}`,
                  `Backed by AgriConnect's Freshness Guarantee — full refund if not satisfied.`,
                  `Direct from farm — your purchase supports a verified UK family farmer.`,
                ].map((point, i) => (
                  <li key={i} className="leading-relaxed" data-testid={`about-item-${i}`}>{point}</li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* Seller / Farmer info */}
            <div id="seller" className="bg-muted/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-border/40 space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <Avatar className="h-9 w-9 sm:h-12 sm:w-12 border-2 border-primary/20 shrink-0">
                  <AvatarImage src={product.farmerAvatar} alt={product.farmerName} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                    {(product.farmerName || "").split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" data-testid="text-seller-name">{product.farmerName}</div>
                  <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{product.farmerRating.toFixed(1)}</span>
                    {product.farmerIsVerified && <><span>·</span><BadgeCheck className="h-3 w-3 text-blue-500" /><span>{t("product_detail.verified_seller")}</span></>}
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3" />
                    <span>{product.farmerLocation}</span>
                    {product.distance && (
                      <><span>·</span><span>{product.distance.toFixed(1)} {t("map.km_away")}</span></>
                    )}
                  </div>
                  <div className="sm:hidden flex items-center gap-1 text-[11px] text-muted-foreground leading-tight">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="font-medium">{product.farmerRating.toFixed(1)}</span>
                    {product.farmerIsVerified && <><span>·</span><BadgeCheck className="h-3 w-3 text-blue-500 shrink-0" /><span className="truncate">Verified</span></>}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-none px-2 text-xs sm:px-3"
                  onClick={() => {
                    document.getElementById("product-conversation")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    window.setTimeout(() => document.getElementById("product-conversation-message")?.focus(), 450);
                  }}
                  aria-label={user?.id === product.farmerId ? "View product conversations" : `Message ${product.farmerName} about ${product.name}`}
                  data-testid="button-contact-seller"
                >
                  <MessageSquare className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">{user?.id === product.farmerId ? "View conversations" : "Message farmer"}</span>
                </Button>
              </div>
              <div className="sm:hidden flex items-center gap-1 text-[11px] text-muted-foreground -mt-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{product.farmerLocation}{product.distance ? ` · ${product.distance.toFixed(1)} km from you` : ""}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Messaging", value: "Available" },
                  { label: "Current stock", value: `${product.stock} ${product.unit}` },
                  { label: "Distance", value: product.distance ? `${product.distance.toFixed(1)} km` : "Location shown" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-background/70 rounded-xl p-2 border border-border/30">
                    <div className="text-sm font-bold text-primary">{value}</div>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Sticky BUY BOX (Amazon-style) */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-3">
              <div className="rounded-2xl border-2 border-border/60 bg-background p-5 space-y-4 shadow-sm" data-testid="card-buy-box">
                {/* Price summary */}
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-medium tracking-tight" data-testid="text-effective-price">{money(effectiveUnitPrice, true)}</span>
                    <span className="text-sm text-muted-foreground">/{product.unit}</span>
                  </div>
                  {effectiveUnitPrice < product.price && (
                    <div className="text-xs">
                      <span className="line-through text-muted-foreground mr-1.5">{money(product.price)}</span>
                      <span className="text-green-700 dark:text-green-400 font-semibold">
                        Save {money(product.price - effectiveUnitPrice)} ({Math.round((1 - effectiveUnitPrice / product.price) * 100)}%)
                      </span>
                    </div>
                  )}
                  {originalPrice && effectiveUnitPrice >= product.price && (
                    <div className="text-xs text-muted-foreground">
                      Was {money(Number(originalPrice))} • Save {money(parseFloat(originalPrice) - product.price)} ({discount}%)
                    </div>
                  )}
                </div>

                {/* F.9 — Bulk pricing tiers */}
                <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-3" data-testid="card-bulk-tiers">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />{t("product_detail.bulk_pricing_title")}
                    </span>
                    {currentTier.discountPct > 0 && (
                      <Badge className="bg-amber-600 text-white hover:bg-amber-600 text-[10px]">
                        −{currentTier.discountPct}% applied
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {BULK_TIERS.map(tier => {
                      const isActive = tier.label === currentTier.label;
                      const tierPrice = +(product.price * (1 - tier.discountPct / 100)).toFixed(2);
                      return (
                        <button
                          key={tier.label}
                          onClick={() => setQuantity(Math.min(product.stock, Math.max(tier.min, 1)))}
                          className={`rounded-lg border p-1.5 text-center transition-all ${
                            isActive
                              ? "border-amber-500 bg-amber-100 dark:bg-amber-900/40 shadow-sm"
                              : "border-border bg-background hover:border-amber-300"
                          }`}
                          data-testid={`button-tier-${tier.label}`}
                        >
                          <div className={`text-[10px] font-semibold ${isActive ? "text-amber-900 dark:text-amber-200" : "text-muted-foreground"}`}>
                            {tier.label} {product.unit}
                          </div>
                          <div className={`text-xs font-bold ${isActive ? "text-amber-900 dark:text-amber-100" : "text-foreground"}`}>
                            {money(tierPrice)}
                          </div>
                          {tier.discountPct > 0 && (
                            <div className="text-[9px] text-green-700 dark:text-green-400 font-semibold">
                              −{tier.discountPct}%
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Free delivery line */}
                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-bold">{t("product_detail.freshness_guarantee")} </span>
                    <span className="text-muted-foreground">{t("product_detail.standard_delivery")}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Estimated arrival </span>
                    <span className="font-bold text-foreground">
                      {(() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 3);
                        return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <MapPin className="h-3 w-3" />
                    <button className="hover:underline">{t("product_detail.express_delivery")}</button>
                  </div>
                </div>

                {/* Stock status */}
                <div className={`text-base font-bold ${product.stock > 50 ? "text-green-600" : product.stock > 10 ? "text-amber-600" : product.stock > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {product.stock > 50
                    ? t("product_detail.in_stock")
                    : product.stock > 10
                    ? `${t("product_detail.low_stock")} ${product.stock} ${product.unit}`
                    : product.stock > 0
                    ? `${t("product_detail.low_stock")} ${product.stock}`
                    : t("product_detail.out_of_stock")}
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-16">{t("product_detail.specs_weight")}:</span>
                  <div className="flex items-center border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="px-2.5 py-1.5 hover:bg-muted transition-colors disabled:opacity-40"
                      disabled={quantity <= 1}
                      data-testid="button-quantity-decrease"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-3 py-1.5 font-semibold min-w-[40px] text-center border-x border-border" data-testid="text-quantity">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                      className="px-2.5 py-1.5 hover:bg-muted transition-colors disabled:opacity-40"
                      disabled={quantity >= product.stock}
                      data-testid="button-quantity-increase"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* F.10 — Subscribe & Save */}
                <div className="rounded-xl border-2 border-border/60 overflow-hidden" data-testid="card-subscribe-save">
                  <button
                    onClick={() => setPurchaseMode("one-time")}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors ${purchaseMode === "one-time" ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-muted/40 border-l-4 border-transparent"}`}
                    data-testid="button-mode-one-time"
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${purchaseMode === "one-time" ? "border-primary" : "border-muted-foreground"}`}>
                      {purchaseMode === "one-time" && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{t("product_detail.buy_now")}</div>
                      <div className="text-xs text-muted-foreground">{money(bulkUnitPrice)} / {product.unit}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setPurchaseMode("subscribe")}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors border-t border-border/60 ${purchaseMode === "subscribe" ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-muted/40 border-l-4 border-transparent"}`}
                    data-testid="button-mode-subscribe"
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${purchaseMode === "subscribe" ? "border-primary" : "border-muted-foreground"}`}>
                      {purchaseMode === "subscribe" && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold flex items-center gap-1.5">
                        <Repeat className="h-3.5 w-3.5 text-primary" />
                        {t("product_detail.subscription_title")}
                        <Badge className="bg-green-600 text-white hover:bg-green-600 text-[10px] ml-1">−{SUBSCRIBE_DISCOUNT_PCT}%</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{money(subUnitPrice)} / {product.unit} • {t("common.cancel")}</div>
                    </div>
                  </button>
                  {purchaseMode === "subscribe" && (
                    <div className="px-3 py-2.5 border-t border-border/60 bg-muted/20 space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("cart.subscription")}</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(Object.keys(FREQUENCY_LABELS) as Array<keyof typeof FREQUENCY_LABELS>).map(f => (
                          <button
                            key={f}
                            onClick={() => setSubFrequency(f)}
                            className={`text-xs py-1.5 rounded-lg border transition-all ${subFrequency === f ? "bg-primary text-primary-foreground border-primary font-semibold" : "border-border hover:border-primary/40 bg-background"}`}
                            data-testid={`button-freq-${f}`}
                          >
                            {FREQUENCY_LABELS[f]}
                          </button>
                        ))}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-start gap-1.5 pt-1">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>First delivery in 3 days, then {FREQUENCY_LABELS[subFrequency].toLowerCase()}. Skip or cancel anytime.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order total summary */}
                <div className="flex items-baseline justify-between text-sm border-t border-border/40 pt-3">
                  <span className="text-muted-foreground">Order total ({quantity} {product.unit}):</span>
                  <div className="text-right">
                    <div className="text-lg font-bold" data-testid="text-line-total">{money(lineTotal, true)}</div>
                    {totalSaved > 0 && (
                      <div className="text-[11px] text-green-700 dark:text-green-400 font-semibold">You save {money(totalSaved)}</div>
                    )}
                  </div>
                </div>

                {/* Action buttons — Amazon yellow + orange */}
                <div className="space-y-2">
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      className="w-full h-10 rounded-full font-semibold bg-amber-300 hover:bg-amber-400 text-black border border-amber-400 shadow-sm"
                      onClick={() => {
                        addToCartMutation.mutate(quantity);
                        if (purchaseMode === "subscribe") {
                          toast({ title: "Subscription scheduled", description: `${product.name} • ${FREQUENCY_LABELS[subFrequency]}` });
                        }
                      }}
                      disabled={product.stock === 0 || addedToCart || addToCartMutation.isPending}
                      data-testid="button-add-to-cart-detail"
                    >
                      {addedToCart ? (
                        <><Check className="h-4 w-4 mr-1.5" />{t("product_detail.added_to_cart")}</>
                      ) : purchaseMode === "subscribe" ? (
                        <><Repeat className="h-4 w-4 mr-1.5" />{t("product_detail.subscribe_button")}</>
                      ) : (
                        <><ShoppingCart className="h-4 w-4 mr-1.5" />{t("product_detail.add_to_cart")}</>
                      )}
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      className="w-full h-10 rounded-full font-semibold bg-orange-500 hover:bg-orange-600 text-white border border-orange-600 shadow-sm"
                      onClick={() => {
                        addToCartMutation.mutate(quantity, {
                          onSuccess: () => setLocation("/cart"),
                        });
                      }}
                      disabled={
                        product.stock === 0 ||
                        purchaseMode === "subscribe" ||
                        addToCartMutation.isPending
                      }
                      data-testid="button-buy-now"
                    >
                      <Zap className="h-4 w-4 mr-1.5" />
                      {addToCartMutation.isPending ? t("product_detail.add_to_cart") : t("product_detail.buy_now")}
                    </Button>
                  </motion.div>
                </div>

                {/* Secure transaction */}
                <div className="space-y-2 text-xs sm:text-sm pt-1">
                  <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] gap-x-3 gap-y-2 items-center">
                    <span className="text-muted-foreground font-semibold">{t("product_detail.security_payment")}</span>
                    <span className="text-primary font-extrabold hover:underline cursor-pointer">{t("product_detail.security_title")}</span>
                    <span className="text-muted-foreground font-semibold">{t("cart_sheet.ship_from")}</span>
                    <span className="text-foreground font-bold truncate">{product.farmerLocation}</span>
                    <span className="text-muted-foreground font-semibold">{t("product_detail.security_seller")}</span>
                    <a href="#seller" className="text-primary font-extrabold hover:underline truncate">{product.farmerName}</a>
                    <span className="text-muted-foreground font-semibold">{t("product_detail.security_returns")}</span>
                    <span className="text-primary font-extrabold hover:underline cursor-pointer">{t("product_detail.freshness_guarantee")}</span>
                  </div>
                </div>

                <Separator />

                {/* Wishlist */}
                <FavoriteProductButton
                  productId={product.id}
                  productName={product.name}
                  variant="outline"
                  size="sm"
                  showLabel
                  className="h-9 w-full rounded-full text-sm"
                  data-testid="button-wishlist-detail"
                />
              </div>

              {/* Delivery & policy info card */}
              <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-2.5" data-testid="card-delivery-info">
                {[
                  { icon: Truck, label: t("product_detail.standard_delivery"), detail: "2–4 days", color: "text-blue-500" },
                  { icon: Clock, label: t("product_detail.express_delivery"), detail: "Next-day", color: "text-amber-500" },
                  { icon: Shield, label: t("product_detail.freshness_guarantee"), detail: "100% refund", color: "text-green-500" },
                  { icon: Calendar, label: t("product_detail.subscription_title"), detail: "Up to 10% off", color: "text-purple-500" },
                ].map(({ icon: Icon, label, detail, color }) => (
                  <div key={label} className="flex items-start gap-2.5">
                    <Icon className={`h-4 w-4 mt-0.5 flex-none ${color}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold leading-tight">{label}</div>
                      <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <ProductConversation product={product} />

        {/* FREQUENTLY BOUGHT TOGETHER — Amazon-style row */}
        {relatedProducts.filter(p => p.id !== product.id).length >= 2 && (
          <div className="mt-6 sm:mt-12 rounded-xl sm:rounded-2xl border border-border/50 bg-muted/20 p-3 sm:p-6" data-testid="section-frequently-bought">
            <h3 className="text-base sm:text-xl font-black text-foreground mb-3 sm:mb-5">{t("product_detail.frequently_bought_title")}</h3>
            <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
              {/* Current product */}
              <div className="flex flex-col items-center w-24 sm:w-36" data-testid="fbt-current">
                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-primary bg-muted shadow-sm">
                  <SafeProductImage src={getImg(0)} fallbackSrc={fallbackProductImageResolution?.fallbackSrc} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-xs sm:text-sm text-center mt-2 line-clamp-2 font-black uppercase text-foreground leading-tight">{product.name}</p>
                <p className="text-xs sm:text-sm font-black text-primary mt-0.5">{money(product.price)}</p>
              </div>

              {relatedProducts.filter(p => p.id !== product.id).slice(0, 2).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 sm:gap-5">
                  <Plus className="h-4 w-4 sm:h-6 sm:w-6 text-foreground/70 font-black" />
                  <button
                    onClick={() => setLocation(relatedProductUrl(p))}
                    className="flex flex-col items-center w-24 sm:w-36 hover:opacity-80 transition-opacity"
                    data-testid={`fbt-related-${i}`}
                  >
                    <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-border/60 bg-muted shadow-sm">
                      <SafeProductImage
                        src={resolveProductImageForProduct(p).src}
                        fallbackSrc={resolveProductImageForProduct(p).fallbackSrc}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-center mt-2 line-clamp-2 font-black uppercase text-foreground hover:text-primary leading-tight">{p.name}</p>
                    <p className="text-xs sm:text-sm font-black text-primary mt-0.5">{format(p.price, { sourceCurrency: p.currency || "GBP" })}</p>
                  </button>
                </div>
              ))}

              {/* Bundle total + add */}
              <div className="w-full sm:w-auto sm:ml-auto sm:pl-6 sm:border-l sm:border-border/60 space-y-2 sm:min-w-[220px] mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/40">
                <div className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wide">{t("product_detail.bulk_pricing_title")}:</div>
                <div className="text-2xl sm:text-4xl font-black text-primary" data-testid="text-bundle-price">
                  {money(product.price + relatedProducts.filter(p => p.id !== product.id).slice(0, 2).reduce((sum, p) => sum + p.price, 0), true)}
                </div>
                <Button
                  size="sm"
                  className="w-full h-11 rounded-xl bg-amber-400 hover:bg-amber-500 text-black border border-amber-500 font-black text-xs sm:text-sm uppercase tracking-wide gap-2 shadow-xs"
                  disabled={isAddingBundle}
                  onClick={async () => {
                    if (isAddingBundle) return;
                    setIsAddingBundle(true);
                    try {
                      const bundle = relatedProducts.filter(p => p.id !== product.id).slice(0, 2);
                      await Promise.all([
                        apiRequest("POST", "/api/cart", { productId: product.id, quantity }),
                        ...bundle.map(p => apiRequest("POST", "/api/cart", { productId: p.id, quantity: 1 })),
                      ]);
                      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
                      toast({ title: "Bundle added to cart!", description: `All ${bundle.length + 1} items added.` });
                    } catch (e: any) {
                      toast({ title: "Bundle add failed", description: e.message || "Some items may not have been added.", variant: "destructive" });
                      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
                    } finally {
                      setIsAddingBundle(false);
                    }
                  }}
                  data-testid="button-add-bundle"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {isAddingBundle ? t("product_detail.add_to_cart") : t("product_detail.add_to_cart")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* RECOMMENDED — based on category/subcategory */}
        {recommended.length > 0 && (
          <div className="mt-10 lg:mt-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-5">
              <h3 className="text-xl lg:text-2xl font-black text-foreground">{t("product_detail.similar_title")}</h3>
              <span className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground font-black">
                {t("product_detail.similar_description")}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {recommended.map(p => (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -3 }}
                  onClick={() => setLocation(relatedProductUrl(p))}
                  className="cursor-pointer"
                  data-testid={`rec-product-${p.id}`}
                >
                  <Card className="overflow-hidden border-border/60 hover:border-primary/50 hover:shadow-xl transition-all duration-300 rounded-2xl bg-card">
                    <div className="aspect-square overflow-hidden bg-muted relative">
                      <SafeProductImage
                        src={resolveProductImageForProduct(p).src}
                        fallbackSrc={resolveProductImageForProduct(p).fallbackSrc}
                        alt={p.name}
                        className="w-full h-full object-cover hover:scale-108 transition-transform duration-500"
                      />
                    </div>
                    <CardContent className="p-3.5 space-y-1.5">
                      <p className="text-xs sm:text-sm font-black uppercase tracking-wide text-foreground line-clamp-2 leading-snug mb-1">{p.name}</p>
                      <div className="flex items-center justify-between gap-1 pt-1">
                        <span className="text-xs sm:text-sm font-black text-primary truncate">
                          {format(p.price, { sourceCurrency: p.currency || "GBP" })}
                          <span className="text-[10px] sm:text-xs font-bold text-muted-foreground ml-0.5">/{p.unit}</span>
                        </span>
                        <div className="flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-black text-foreground">{p.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* BOTTOM: Tabs for Details / Nutrition / Reviews / More */}
        <div className="mt-8 lg:mt-12">
          <Tabs defaultValue="details" id="reviews">
            <TabsList className="w-full justify-start h-auto flex-wrap gap-2 border-2 border-emerald-300 bg-emerald-50/90 p-2 rounded-2xl shadow-sm">
              <TabsTrigger value="details" className="px-5 py-3 text-sm sm:text-base font-black rounded-xl text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-amber-500/60 transition-all">{t("product_detail.specs_title")}</TabsTrigger>
              <TabsTrigger value="reviews" className="px-5 py-3 text-sm sm:text-base font-black rounded-xl text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-amber-500/60 transition-all">{t("product_detail.reviews_title")} ({product.reviewCount})</TabsTrigger>
              <TabsTrigger value="nutrition" className="px-5 py-3 text-sm sm:text-base font-black rounded-xl text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-amber-500/60 transition-all">{t("product_detail.nutrition_title")}</TabsTrigger>
              <TabsTrigger value="more" className="px-5 py-3 text-sm sm:text-base font-black rounded-xl text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-amber-500/60 transition-all">{t("seller_profile.recent_products")}</TabsTrigger>
            </TabsList>

            {/* Details tab */}
            <TabsContent value="details" className="mt-6">
              <Card className="border-2 border-border/80 rounded-2xl shadow-md bg-card overflow-hidden">
                <CardContent className="p-5 sm:p-8 space-y-6 sm:space-y-8">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-foreground mb-4">{t("product_detail.specs_title")}</h3>
                    <div className={`text-foreground/90 font-bold leading-relaxed text-base sm:text-lg transition-all ${showFullDesc ? "" : "line-clamp-4"}`}>
                      {product.description}
                      {" "}This premium produce is grown with care by {product.farmerName} in {product.farmerLocation},
                      using sustainable farming practices. Each batch is harvested at peak freshness to ensure maximum
                      nutritional value and flavour. Our rigorous quality control ensures that only the best products
                      reach our customers. The farm operates under full traceability — from seed to your plate.
                      Ideal for home cooks, restaurants, and health-conscious consumers alike.
                    </div>
                    <button
                      onClick={() => setShowFullDesc(d => !d)}
                      className="mt-3 flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black text-sm sm:text-base hover:underline"
                    >
                      {showFullDesc ? <><ChevronUp className="h-4.5 w-4.5" />{t("common.close")}</> : <><ChevronDown className="h-4.5 w-4.5" />{t("help.read_more")}</>}
                    </button>
                  </div>

                  <Separator className="bg-border/80" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                    <div>
                      <h4 className="font-black text-sm sm:text-base uppercase tracking-widest text-foreground mb-4">{t("product_detail.specs_title")}</h4>
                      <div className="space-y-3">
                        {[
                          ["Category", (product.categoryId || "").replace(/-/g, " ")],
                          ["Unit", product.unit],
                          ["Stock Available", `${product.stock} ${product.unit}`],
                          ["Organic", product.isOrganic ? "Yes — Certified" : "No"],
                          ["Origin", product.farmerLocation],
                          ["Farmer Rating", `${product.farmerRating.toFixed(1)} / 5`],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between items-center text-sm sm:text-base border-b-2 border-border/40 pb-2.5">
                            <span className="font-extrabold text-foreground/80">{label}</span>
                            <span className="font-black text-foreground capitalize">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-black text-sm sm:text-base uppercase tracking-widest text-foreground mb-4">{t("product_detail.specs_farm_practices")}</h4>
                      <div className="space-y-3">
                        {[
                          "No synthetic pesticides",
                          "Water-efficient irrigation",
                          "Soil health monitoring",
                          "Carbon-neutral delivery options",
                          "Fair wage certified",
                          "Plastic-minimal packaging",
                        ].map(item => (
                          <div key={item} className="flex items-center gap-3 text-sm sm:text-base border-b-2 border-border/40 pb-2.5">
                            <Check className="h-5 w-5 text-green-600 dark:text-green-400 font-black flex-none" />
                            <span className="font-bold text-foreground">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews tab */}
            <TabsContent value="reviews" className="mt-6" id="reviews">
              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
                {/* Rating summary */}
                <Card className="border-2 border-border/80 rounded-2xl shadow-md bg-card h-fit">
                  <CardContent className="p-5 sm:p-7 space-y-5">
                    <div className="text-center">
                      <div className="text-5xl sm:text-6xl lg:text-7xl font-black text-foreground">{product.rating.toFixed(1)}</div>
                      <div className="flex items-center justify-center gap-1.5 my-3">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-6 w-6 ${s <= Math.round(product.rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`} />
                        ))}
                      </div>
                      <div className="text-sm sm:text-base font-black text-foreground/80">{t("product_detail.based_on_reviews", { count: product.reviewCount })}</div>
                    </div>
                    <Separator className="bg-border/80" />
                    <div className="space-y-2.5">
                      {breakdown.map(({ star, pct, count }) => (
                        <div key={star} className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                          <span className="w-8 text-right font-black text-foreground">{star}★</span>
                          <Progress value={pct} className="h-2.5 flex-1" />
                          <span className="w-10 text-right font-black text-foreground">{pct}%</span>
                        </div>
                      ))}
                    </div>
                    {/* Review eligibility / write form toggle */}
                    {!isAuthenticated ? (
                      <Button variant="outline" className="w-full h-11 text-xs sm:text-sm font-black uppercase tracking-wider gap-2 border-2 border-border/80 rounded-xl" onClick={() => setLocation("/login")}>
                        <Lock className="h-4 w-4" /> {t("product_detail.write_review")}
                      </Button>
                    ) : reviewEligibility?.hasReviewed ? (
                      <div className="flex items-center gap-2 justify-center text-green-600 font-black text-sm bg-green-50 dark:bg-green-950/40 border-2 border-green-500/30 rounded-xl py-2.5 px-4 shadow-2xs">
                        <CheckCircle className="h-5 w-5" /> {t("product_detail.verified_badge")}
                      </div>
                    ) : reviewEligibility?.canReview ? (
                      <Button
                        className="w-full h-11 text-xs sm:text-sm font-black uppercase tracking-wider gap-2 bg-amber-400 hover:bg-amber-500 text-black shadow-md rounded-xl"
                        onClick={() => setShowReviewForm(!showReviewForm)}
                      >
                        <Star className="h-4 w-4 text-black" /> {showReviewForm ? t("common.cancel") : t("product_detail.write_review")}
                      </Button>
                    ) : (
                      <div className="text-center text-xs sm:text-sm font-bold text-muted-foreground bg-muted/50 rounded-xl py-3 px-3 border border-border/60">
                        <Package className="h-5 w-5 mx-auto mb-1" />
                        {t("product_detail.no_reviews_yet")}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Review list */}
                <div className="space-y-4">
                  {/* Inline write review form */}
                  {showReviewForm && reviewEligibility?.canReview && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                    >
                      <Card className="border-2 border-primary/40 bg-primary/5 rounded-2xl shadow-md">
                        <CardContent className="p-6 space-y-4">
                          <h4 className="font-black text-lg text-foreground flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" /> {t("product_detail.write_review")}
                          </h4>
                          <div>
                            <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground mb-2 block">{t("filters.rating")}</Label>
                            <div className="flex gap-1.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onMouseEnter={() => setReviewHover(s)}
                                  onMouseLeave={() => setReviewHover(0)}
                                  onClick={() => setReviewRating(s)}
                                  className="transition-transform hover:scale-110"
                                >
                                  <Star className={`h-8 w-8 transition-colors ${s <= (reviewHover || reviewRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="pd-review-comment" className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground mb-2 block">{t("product_detail.reviews_title")}</Label>
                            <Textarea
                              id="pd-review-comment"
                              data-testid="input-pd-review"
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              placeholder="Share your experience with this product..."
                              rows={3}
                              className="text-base font-bold rounded-xl border-2 border-border/80"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => submitReviewMutation.mutate()}
                            disabled={!reviewComment.trim() || submitReviewMutation.isPending}
                            className="h-11 px-6 font-black uppercase tracking-wider text-xs sm:text-sm gap-2 bg-amber-400 text-black hover:bg-amber-500 rounded-xl shadow-md"
                            data-testid="btn-submit-pd-review"
                          >
                            {submitReviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                            {t("product_detail.write_review")}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Real reviews from API */}
                  <AnimatePresence>
                    {realReviews.map((review, idx) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="border-2 border-border/80 bg-card rounded-2xl shadow-sm">
                          <CardContent className="p-5 sm:p-6 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-primary/30">
                                  {review.buyerAvatar ? (
                                    <AvatarImage src={review.buyerAvatar} />
                                  ) : null}
                                  <AvatarFallback className="text-xs bg-primary/20 text-primary font-black">
                                    {review.buyerName.split(" ").map((n) => n[0]).join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-black text-base text-foreground">{review.buyerName}</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="outline" className="text-[10px] sm:text-xs font-black px-2 py-0.5 border-green-500/40 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 rounded-lg">
                                      ✓ {t("product_detail.verified_badge")}
                                    </Badge>
                                    <span className="text-xs font-bold text-muted-foreground">
                                      {new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 flex-none">
                                {[1,2,3,4,5].map((s) => (
                                  <Star key={s} className={`h-4 w-4 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`} />
                                ))}
                              </div>
                            </div>
                            <p className="text-base sm:text-lg font-bold text-foreground/90 leading-relaxed">{review.comment}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Generated reviews */}
                  <AnimatePresence>
                    {reviews.map((review, idx) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="border-2 border-border/80 bg-card rounded-2xl shadow-sm">
                          <CardContent className="p-5 sm:p-6 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-primary/30">
                                  <AvatarFallback className="text-xs bg-primary/20 text-primary font-black">
                                    {review.name.split(" ").map(n => n[0]).join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-black text-base text-foreground">{review.name}</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {review.verified && (
                                      <Badge variant="outline" className="text-[10px] sm:text-xs font-black px-2 py-0.5 border-green-500/40 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 rounded-lg">
                                        ✓ {t("product_detail.verified_badge")}
                                      </Badge>
                                    )}
                                    <span className="text-xs font-bold text-muted-foreground">{review.date}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 flex-none">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} className={`h-4 w-4 ${s <= review.stars ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`} />
                                ))}
                              </div>
                            </div>
                            <p className="text-base sm:text-lg font-bold text-foreground/90 leading-relaxed">{review.comment}</p>
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-muted-foreground pt-1">
                              <ThumbsUp className="h-4 w-4 text-primary" />
                              <span>{t("product_detail.helpful_button", { count: review.helpful })}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </TabsContent>

            {/* Nutrition / Tags tab */}
            <TabsContent value="nutrition" className="mt-6">
              <Card className="border-2 border-border/80 rounded-2xl shadow-md bg-card">
                <CardContent className="p-5 sm:p-8 space-y-6">
                  {product.dietaryTags && product.dietaryTags.length > 0 ? (
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-foreground mb-4">{t("product_detail.nutrition_title")}</h3>
                      <div className="flex flex-wrap gap-2.5">
                        {product.dietaryTags.map(tag => (
                          <Badge key={tag} className="text-sm sm:text-base font-black px-4 py-2 bg-primary/15 text-primary border-2 border-primary/40 rounded-xl shadow-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-foreground/80 font-bold text-base flex items-center gap-2">
                      <Info className="h-5 w-5 text-amber-500" />
                      {t("product_detail.nutrition_ingredients")}
                    </div>
                  )}
                  <Separator className="bg-border/80" />
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-foreground mb-4">{t("product_detail.quality_title")}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[
                        { label: "Farm Verified", icon: BadgeCheck, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200" },
                        ...(product.isOrganic ? [{ label: "Organic Certified", icon: Leaf, color: "text-green-700 bg-green-50 dark:bg-green-950/40 border-green-200" }] : []),
                        { label: "Quality Assured", icon: Award, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200" },
                        { label: "Traceable Origin", icon: BarChart3, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200" },
                        { label: "Fresh Guarantee", icon: Shield, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200" },
                      ].map(({ label, icon: Icon, color }) => (
                        <div key={label} className={`flex items-center gap-3 rounded-2xl p-4 border-2 shadow-xs ${color}`}>
                          <Icon className="h-6 w-6 shrink-0" />
                          <span className="text-sm sm:text-base font-black text-foreground">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* More from seller tab */}
            <TabsContent value="more" className="mt-6">
              {relatedProducts.length > 0 ? (
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground mb-5">{t("seller_profile.recent_products")}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                    {relatedProducts.filter(p => p.id !== product.id).slice(0, 8).map(p => (
                      <motion.div
                        key={p.id}
                        whileHover={{ y: -3 }}
                        onClick={() => setLocation(relatedProductUrl(p))}
                        className="cursor-pointer"
                      >
                        <Card className="overflow-hidden border-2 border-border/80 bg-card rounded-2xl hover:border-primary/60 hover:shadow-xl transition-all shadow-md">
                          <div className="aspect-square overflow-hidden bg-muted">
                            <SafeProductImage
                              src={resolveProductImageForProduct(p).src}
                              fallbackSrc={resolveProductImageForProduct(p).fallbackSrc}
                              alt={p.name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <CardContent className="p-4 space-y-2">
                            <p className="text-sm sm:text-base font-black uppercase text-foreground line-clamp-2 leading-tight">{p.name}</p>
                            <div className="flex items-center justify-between gap-1 pt-1">
                              <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 font-mono">{format(p.price, { sourceCurrency: p.currency || "GBP" })}/{p.unit}</span>
                              <div className="flex items-center gap-1 bg-amber-400/20 px-2 py-0.5 rounded-lg border border-amber-400/40">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                <span className="text-xs font-black text-foreground">{p.rating.toFixed(1)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground font-bold text-base">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>{t("seller_profile.no_products_available")}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Mobile + tablet sticky add-to-cart bar (shown whenever desktop buy box is hidden) */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-[9998] bg-background/95 backdrop-blur-xl border-t border-border/60 px-4 py-2 flex items-center gap-3 shadow-lg">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate leading-tight">{product.name}</p>
          <p className="text-sm font-black text-primary">{money(product.price, true)}<span className="text-muted-foreground font-normal text-xs">/{product.unit}</span></p>
        </div>
        <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="px-2.5 py-1.5 hover:bg-muted transition-colors disabled:opacity-40"
            disabled={quantity <= 1}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="px-3 py-1.5 font-bold text-sm min-w-[32px] text-center border-x border-border">{quantity}</span>
          <button
            onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
            className="px-2.5 py-1.5 hover:bg-muted transition-colors disabled:opacity-40"
            disabled={quantity >= product.stock}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0 h-9 px-4 font-bold shadow-md shadow-primary/20"
          onClick={() => {
            addToCartMutation.mutate(quantity);
          }}
          disabled={product.stock === 0 || addedToCart || addToCartMutation.isPending}
        >
          {addedToCart ? <><Check className="h-4 w-4" />{t("product_detail.added_to_cart")}</> : <><ShoppingCart className="h-4 w-4" />{t("product_detail.add_to_cart")}</>}
        </Button>
      </div>
    </div>
  );
}
