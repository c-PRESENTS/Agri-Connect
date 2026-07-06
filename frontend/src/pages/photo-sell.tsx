import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { PhotoSellFlow } from "@/components/photo-sell-flow";
import { TopNavigation } from "@/components/top-navigation";
import { useToast } from "@/hooks/use-toast";
import type { AIDetectionResult } from "@shared/schema";

export default function PhotoSell() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();

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

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <PhotoSellFlow
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}
