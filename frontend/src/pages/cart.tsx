import { useLocation } from "wouter";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Loader2, XCircle } from "lucide-react";
import { TopNavigation } from "@/components/top-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { getLoginPath } from "@/lib/auth-utils";
import { resolveProductImageForProduct } from "@/lib/product-images";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrency } from "@/contexts/currency-context";
import { CheckoutProgress } from "@/components/checkout-progress";
import { SafeProductImage } from "@/components/safe-product-image";

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { isAuthenticated } = useAuth();
  const { items, total: subtotal, isLoading, isError, refetch, updateItem, removeItem } = useCart();

  // Fulfilment is selected per farmer during checkout. Catalog prices are
  // tax-inclusive for the volunteer MVP, so the cart does not invent fees.
  const total = subtotal;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      setLocation(getLoginPath("/checkout"));
      return;
    }
    setLocation("/checkout");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center" data-testid="cart-error-state">
          <XCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to load your cart</h2>
          <p className="text-muted-foreground mb-6">Please try again.</p>
          <Button variant="outline" onClick={() => refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-6"
          >
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </motion.div>
          <h2 className="text-xl font-semibold mb-2" data-testid="text-cart-empty-title">
            {t("cart.empty_title", "Your cart is empty")}
          </h2>
          <p className="text-muted-foreground text-center mb-6">
            {t("cart.empty_description", "Add fresh produce from local farmers to get started")}
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-start-shopping">
            {t("cart.start_shopping", "Start Shopping")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      {/* Mobile sticky checkout bar */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border/40 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t("cart.total", "Total")}</span>
          <span className="font-bold text-base" data-testid="text-total-mobile">{format(total, { includeCode: true })}</span>
        </div>
        <Button
          className="flex-1 gap-2 h-11 text-sm font-semibold"
          onClick={handleCheckout}
          data-testid="button-checkout-mobile"
        >
          {t("cart.checkout", "Checkout")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-32 md:pb-12 space-y-8">
        <div className="mb-8 rounded-3xl border-2 border-border/80 bg-card px-4 py-6 shadow-md sm:px-8">
          <CheckoutProgress currentStep={1} />
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight" data-testid="text-cart-heading">
          {t("cart.title", "Your Cart")}{" "}
          <span className="text-muted-foreground text-xl sm:text-2xl font-bold">({items.length})</span>
        </h1>

        <Card className="border-2 border-border/80 rounded-3xl shadow-md overflow-hidden">
          <CardHeader className="pb-4 bg-muted/20 border-b border-border/60">
            <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-3 text-foreground">
              <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              {t("cart.order_items", "Order Items")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-5">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex gap-4 sm:gap-6 p-4 rounded-2xl border-2 border-border/50 hover:border-primary/40 bg-card hover:bg-muted/20 transition-all shadow-xs"
                      data-testid={`cart-item-${item.id}`}
                    >
                      <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl overflow-hidden bg-muted flex-shrink-0 border-2 border-border/60 shadow-xs">
                        <SafeProductImage
                          src={resolveProductImageForProduct(item.product).src}
                          fallbackSrc={resolveProductImageForProduct(item.product).fallbackSrc}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4
                            className="font-black text-base sm:text-lg md:text-xl text-foreground uppercase tracking-wide truncate"
                            data-testid={`text-cart-item-name-${item.id}`}
                          >
                            {item.product.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Avatar className="h-5 w-5 sm:h-6 sm:w-6 border">
                              <AvatarImage src={item.product.farmerAvatar} />
                              <AvatarFallback className="text-[10px] font-black">
                                {item.product.farmerName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs sm:text-sm font-bold text-muted-foreground truncate">
                              {item.product.farmerName}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                          <div className="flex flex-col">
                            <span className="font-black text-base sm:text-lg text-primary" data-testid={`text-cart-unit-price-${item.id}`}>
                              {format(item.product.price, {
                                sourceCurrency: item.product.currency || "GBP",
                                includeCode: true,
                              })}/{item.product.unit}
                            </span>
                            <p className="text-xs sm:text-sm font-bold text-muted-foreground mt-0.5">
                              {t("cart.line_total", "Line total")}:{" "}
                              <span className="font-black text-foreground text-sm sm:text-base" data-testid={`text-cart-line-total-${item.id}`}>
                                {format(item.product.price * item.quantity, {
                                  sourceCurrency: item.product.currency || "GBP",
                                  includeCode: true,
                                })}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-9 w-9 rounded-xl border-2 hover:border-primary"
                              onClick={() =>
                                updateItem.mutate({
                                  itemId: item.id,
                                  quantity: item.quantity - 1,
                                })
                              }
                              disabled={updateItem.isPending}
                              aria-label={`Decrease quantity for ${item.product.name}`}
                              data-testid={`button-decrease-${item.id}`}
                            >
                              <Minus className="h-4 w-4 stroke-[3]" />
                            </Button>
                            <span
                              className="w-10 text-center text-base sm:text-lg font-black text-foreground"
                              data-testid={`text-quantity-${item.id}`}
                            >
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-9 w-9 rounded-xl border-2 hover:border-primary"
                              onClick={() =>
                                updateItem.mutate({
                                  itemId: item.id,
                                  quantity: item.quantity + 1,
                                })
                              }
                              disabled={
                                updateItem.isPending ||
                                item.quantity >= item.product.stock
                              }
                              aria-label={`Increase quantity for ${item.product.name}`}
                              data-testid={`button-increase-${item.id}`}
                            >
                              <Plus className="h-4 w-4 stroke-[3]" />
                            </Button>
                          </div>
                        </div>

                        {item.purchaseMode === "subscribe" && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs font-black bg-primary/10 text-primary px-2.5 py-1 rounded-lg w-fit">
                            ↻ Subscribe • {item.subFrequency === "weekly" ? t("cart.weekly") : item.subFrequency === "biweekly" ? t("cart.biweekly") : t("cart.monthly")}
                          </span>
                        )}
                        {item.unitPrice !== undefined && item.unitPrice < item.product.price && item.purchaseMode !== "subscribe" && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs font-black bg-amber-100 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 px-2.5 py-1 rounded-lg w-fit">
                            🏷 {t("cart.bulk_discount")}
                          </span>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem.mutate(item.id)}
                        disabled={removeItem.isPending}
                        aria-label={`Remove ${item.product.name} from cart`}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-2 border-border/80 rounded-3xl shadow-md p-2">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="space-y-4 text-base sm:text-lg">
              <div className="flex justify-between items-center">
                <span className="font-bold text-muted-foreground">{t("cart.subtotal", "Subtotal")}</span>
                <span className="font-black text-foreground text-lg sm:text-xl" data-testid="text-subtotal">{format(subtotal, { includeCode: true })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-muted-foreground">{t("cart.delivery", "Delivery")}</span>
                <span className="font-bold text-foreground/80 text-sm sm:text-base" data-testid="text-delivery-fee">Calculated at checkout</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-muted-foreground">Taxes</span>
                <span className="font-bold text-foreground/80 text-sm sm:text-base" data-testid="text-cart-tax">Included where applicable</span>
              </div>
              <Separator className="my-4 h-0.5" />
              <div className="flex justify-between items-center">
                <span className="font-black text-xl sm:text-2xl uppercase tracking-wider text-foreground">{t("cart.total", "Total")}</span>
                <span className="font-black text-2xl sm:text-3xl text-primary" data-testid="text-total">{format(total, { includeCode: true })}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                className="w-full h-14 sm:h-16 gap-3 text-base sm:text-lg font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-lg transition-transform hover:scale-[1.01]"
                onClick={handleCheckout}
                data-testid="button-checkout"
              >
                {isAuthenticated
                  ? `${t("cart.checkout", "Proceed to Checkout")} • ${format(total, { includeCode: true })}`
                  : t("cart.login_to_checkout", "Sign in to checkout")}
                <ArrowRight className="h-6 w-6 stroke-[3]" />
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 text-sm sm:text-base font-black uppercase tracking-wider border-2 hover:bg-muted"
                onClick={() => setLocation("/")}
                data-testid="button-continue-shopping"
              >
                {t("cart.continue_shopping", "Continue Shopping")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
