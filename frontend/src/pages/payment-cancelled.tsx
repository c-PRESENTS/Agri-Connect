import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TopNavigation } from "@/components/top-navigation";

export default function PaymentCancelledPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <div className="max-w-xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <Card>
          <CardContent className="p-5 sm:p-8 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <XCircle className="h-9 w-9 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-black mb-2" data-testid="text-payment-cancelled">{t("payment_cancelled.title")}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t("payment_cancelled.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => navigate("/cart")} data-testid="button-back-cart">
                <ArrowLeft className="h-4 w-4 mr-2" /> {t("payment_cancelled.try_again")}
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} data-testid="button-home">
                {t("payment_cancelled.go_to_marketplace")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
