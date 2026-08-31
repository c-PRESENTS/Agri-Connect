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
  const { items, total: subtotal, isLoading, isError, refetch, updateItem, removeItem, clearCart } = useCart();

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

      <main className="mx-auto w-full max-w-[1440px] px-3 py-3 pb-32 sm:px-5 sm:py-4 md:pb-8 lg:px-6">
        <div className="rounded-2xl border border-border/80 bg-card px-3 py-3 shadow-sm sm:px-5">
          <CheckoutProgress currentStep={1} compact />
        </div>
        <h1 className="my-3 text-2xl font-black tracking-tight text-foreground sm:my-4 sm:text-3xl" data-testid="text-cart-heading">
          {t("cart.title", "Your Cart")}{" "}
          <span className="text-base font-bold text-muted-foreground sm:text-lg">({items.length})</span>
        </h1>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card className="overflow-hidden rounded-2xl border border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20 px-4 py-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base font-black text-foreground sm:text-lg">
              <ShoppingBag className="h-5 w-5 text-primary" />
              {t("cart.order_items", "Order Items")}
            </CardTitle>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearCart.mutate()}
                disabled={clearCart.isPending}
                className="h-8 px-2.5 text-xs font-bold text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 transition-colors cursor-pointer rounded-lg border border-destructive/20 hover:border-destructive/40"
                data-testid="button-clear-cart"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t("cart.clear_all", "Remove All")}</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-2.5 sm:p-3">
            <ScrollArea className="max-h-[calc(100vh-15rem)] min-h-[22rem]">
              <div className="space-y-2 pr-1">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex gap-3 rounded-xl border border-border/60 bg-card p-2.5 shadow-xs transition-all hover:border-primary/40 hover:bg-muted/20 sm:p-3"
                      data-testid={`cart-item-${item.id}`}
                    >
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-xs sm:h-24 sm:w-24">
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
                            className="truncate text-sm font-black uppercase tracking-wide text-foreground sm:text-base"
                            data-testid={`text-cart-item-name-${item.id}`}
                          >
                            {item.product.name}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <Avatar className="h-4 w-4 border sm:h-5 sm:w-5">
                              <AvatarImage src={item.product.farmerAvatar} />
                              <AvatarFallback className="text-[10px] font-black">
                                {item.product.farmerName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate text-[11px] font-bold text-muted-foreground sm:text-xs">
                              {item.product.farmerName}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-primary sm:text-base" data-testid={`text-cart-unit-price-${item.id}`}>
                              {format(item.product.price, {
                                sourceCurrency: item.product.currency || "GBP",
                                includeCode: true,
                              })}/{item.product.unit}
                            </span>
                            <p className="mt-0.5 text-[11px] font-bold text-muted-foreground sm:text-xs">
                              {t("cart.line_total", "Line total")}:{" "}
                              <span className="text-xs font-black text-foreground sm:text-sm" data-testid={`text-cart-line-total-${item.id}`}>
                                {format(item.product.price * item.quantity, {
                                  sourceCurrency: item.product.currency || "GBP",
                                  includeCode: true,
                                })}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 rounded-lg border hover:border-primary"
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
                              className="w-7 text-center text-sm font-black text-foreground"
                              data-testid={`text-quantity-${item.id}`}
                            >
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 rounded-lg border hover:border-primary"
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
                        className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeItem.mutate(item.id)}
                        disabled={removeItem.isPending}
                        aria-label={`Remove ${item.product.name} from cart`}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 shadow-sm xl:sticky xl:top-3">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="space-y-3.5 text-base">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-foreground/75">{t("cart.subtotal", "Subtotal")}</span>
                <span className="text-lg font-black text-foreground" data-testid="text-subtotal">{format(subtotal, { includeCode: true })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-foreground/75">{t("cart.delivery", "Delivery")}</span>
                <span className="text-right text-sm font-bold leading-snug text-foreground/85" data-testid="text-delivery-fee">Calculated at checkout</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-foreground/75">Taxes</span>
                <span className="text-right text-sm font-bold leading-snug text-foreground/85" data-testid="text-cart-tax">Included where applicable</span>
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-black uppercase tracking-wide text-foreground">{t("cart.total", "Total")}</span>
                <span className="text-2xl font-black tracking-tight text-primary" data-testid="text-total">{format(total, { includeCode: true })}</span>
              </div>
            </div>

            <div className="hidden space-y-3 pt-2 md:block">
              <Button
                className="h-12 w-full gap-2 bg-amber-400 hover:bg-amber-500 text-black border border-amber-500/50 px-4 text-sm sm:text-[15px] font-black uppercase tracking-wider rounded-xl shadow-md transition-transform hover:scale-[1.01] cursor-pointer"
                onClick={handleCheckout}
                data-testid="button-checkout"
              >
                <span>
                  {isAuthenticated
                    ? t("cart.checkout", "Proceed to Checkout")
                    : t("cart.login_to_checkout", "Sign in to checkout")}
                </span>
                <ArrowRight className="h-4.5 w-4.5 shrink-0 stroke-[2.8]" />
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full border border-border/80 text-sm font-black uppercase tracking-wider rounded-xl hover:bg-muted cursor-pointer"
                onClick={() => setLocation("/")}
                data-testid="button-continue-shopping"
              >
                {t("cart.continue_shopping", "Continue Shopping")}
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </main>
    </div>
  );
}
