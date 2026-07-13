import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { PhotoSellFlow } from "@/components/photo-sell-flow";
import { TopNavigation } from "@/components/top-navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { hasSellerTaxonomyAccess } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import type { AIDetectionResult } from "@shared/schema";

export default function PhotoSell() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  const handleComplete = (data: AIDetectionResult & { image: string }) => {
    toast({
      title: t("photo_sell.product_listed", "Product Listed!"),
      description: `${data.productName} - ${data.suggestedPrice}/${data.unit}`,
    });
    setLocation("/dashboard");
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
      />
    </div>
  );
}
