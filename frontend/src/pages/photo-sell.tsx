import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { PhotoSellFlow } from "@/components/photo-sell-flow";
import { TopNavigation } from "@/components/top-navigation";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { hasSellerTaxonomyAccess } from "@/lib/categories";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import type { AIDetectionResult, Product } from "@shared/schema";

const MAX_LISTING_IMAGE_CHARS = 85_000;

type ListingTarget =
  | Pick<AIDetectionResult, "productName" | "suggestedCategory" | "suggestedSubcategory">
  | Pick<Product, "name" | "categoryId" | "subcategoryId">;

function stockFromDetectedQuantity(quantity: string): number {
  const match = quantity.match(/\d+/);
  if (!match) return 1;
  const stock = Number.parseInt(match[0], 10);
  return Number.isFinite(stock) && stock > 0 ? stock : 1;
}

async function compressListingImage(imageDataUrl: string): Promise<string> {
  if (!imageDataUrl.startsWith("data:image/")) return imageDataUrl;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the uploaded image. Please try another photo."));
    img.src = imageDataUrl;
  });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is not available in this browser.");

  let maxSide = 720;
  let quality = 0.78;
  let output = imageDataUrl;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    output = canvas.toDataURL("image/jpeg", quality);
    if (output.length <= MAX_LISTING_IMAGE_CHARS) return output;

    maxSide = Math.round(maxSide * 0.82);
    quality = Math.max(0.48, quality - 0.07);
  }

  return output;
}

export default function PhotoSell() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  const buildListingUrl = (data: ListingTarget) => {
    const productName = "productName" in data ? data.productName : data.name;
    const categoryId = "suggestedCategory" in data ? data.suggestedCategory : data.categoryId;
    const subcategoryId = "suggestedSubcategory" in data ? data.suggestedSubcategory : data.subcategoryId;
    const params = new URLSearchParams();
    if (categoryId) params.set("category", categoryId);
    if (subcategoryId) params.set("subcategory", subcategoryId);
    if (productName) params.set("search", productName);
    return `/?${params.toString()}`;
  };

  const viewListing = (data: ListingTarget) => {
    const categoryId = "suggestedCategory" in data ? data.suggestedCategory : data.categoryId;
    setLocation(buildListingUrl(data));
    window.dispatchEvent(
      new CustomEvent("agri-subcategory-open", {
        detail: categoryId,
      }),
    );
  };

  const handleComplete = async (data: AIDetectionResult & { image: string }) => {
    const listingImage = await compressListingImage(data.image);
    const response = await apiRequest("POST", "/api/products", {
      name: data.productName.trim(),
      description: `Photo-Sell listing for ${data.productName.trim()}. Quality grade ${data.qualityGrade}. Estimated quantity ${data.estimatedQuantity}.`,
      price: Number(data.suggestedPrice),
      unit: data.unit.trim() || "kg",
      stock: stockFromDetectedQuantity(data.estimatedQuantity),
      categoryId: data.suggestedCategory,
      subcategoryId: data.suggestedSubcategory,
      images: [listingImage],
    });
    const product = (await response.json()) as Product;
    queryClient.invalidateQueries({
      predicate: (query) => String(query.queryKey[0] ?? "").startsWith("/api/products"),
    });

    toast({
      title: t("photo_sell.product_listed", "Product Listed!"),
      description: `${data.productName} - ${data.suggestedPrice}/${data.unit}`,
      action: (
        <ToastAction altText={t("photo_sell.view_listing")} onClick={() => setLocation(`/products/${product.id}`)}>
          {t("photo_sell.view_listing")}
        </ToastAction>
      ),
    });
    viewListing(product);
  };

  const handleCancel = () => {
    setLocation("/dashboard");
  };

  if (!isLoading && !hasSellerTaxonomyAccess(user?.role)) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
          <h1 className="text-xl font-bold">Seller access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete your profile as a farmer to create and manage listings.
          </p>
          <Button className="mt-5" onClick={() => setLocation("/settings")}>Complete seller profile</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <PhotoSellFlow
        onComplete={handleComplete}
        onCancel={handleCancel}
        onManualListing={() => setLocation("/dashboard/list-product")}
        onViewListing={viewListing}
      />
    </div>
  );
}
