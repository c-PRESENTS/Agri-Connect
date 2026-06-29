import { useLocation } from "wouter";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TopNavigation } from "@/components/top-navigation";

export default function PaymentCancelledPage() {
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
            <h1 className="text-2xl font-black mb-2" data-testid="text-payment-cancelled">Payment cancelled</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your card was not charged. Your cart is still saved — you can complete checkout whenever you're ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => navigate("/cart")} data-testid="button-back-cart">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to cart
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} data-testid="button-home">
                Continue shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
