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
import { getProductImage } from "@/lib/product-images";
import { motion, AnimatePresence } from "framer-motion";

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { items, total: subtotal, isLoading, isError, refetch, updateItem, removeItem } = useCart();

  const FREE_DELIVERY_THRESHOLD = 30;
  const STANDARD_FEE = 4.99;
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD || subtotal === 0 ? 0 : STANDARD_FEE;
  const tax = parseFloat((subtotal * 0.2).toFixed(2));
  const total = subtotal + deliveryFee + tax;

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
          <span className="font-bold text-base" data-testid="text-total-mobile">£{total.toFixed(2)}</span>
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

      <div className="max-w-4xl mx-auto p-4 pb-32 md:pb-8 space-y-4">
        <h1 className="text-2xl font-bold" data-testid="text-cart-heading">
          {t("cart.title", "Your Cart")}{" "}
          <span className="text-muted-foreground text-base font-normal">({items.length})</span>
        </h1>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              {t("cart.order_items", "Order Items")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex gap-3"
                      data-testid={`cart-item-${item.id}`}
                    >
                      <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={getProductImage(item.product.name, item.product.categoryId, "sm")}
                          alt={item.product.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className="font-medium text-sm truncate"
                          data-testid={`text-cart-item-name-${item.id}`}
                        >
                          {item.product.name}
                        </h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={item.product.farmerAvatar} />
                            <AvatarFallback className="text-[8px]">
                              {item.product.farmerName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate">
                            {item.product.farmerName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm" data-testid={`text-cart-unit-price-${item.id}`}>
                              £{item.product.price.toFixed(2)}/{item.product.unit}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() =>
                                updateItem.mutate({
                                  itemId: item.id,
                                  quantity: item.quantity - 1,
                                })
                              }
                              disabled={updateItem.isPending}
                              data-testid={`button-decrease-${item.id}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span
                              className="w-8 text-center text-sm font-medium"
                              data-testid={`text-quantity-${item.id}`}
                            >
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
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
                              data-testid={`button-increase-${item.id}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("cart.line_total", "Line total")}:{" "}
                          <span className="font-semibold text-foreground" data-testid={`text-cart-line-total-${item.id}`}>
                            £{(item.product.price * item.quantity).toFixed(2)}
                          </span>
                        </p>
                        {item.purchaseMode === "subscribe" && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            ↻ Subscribe • {item.subFrequency === "weekly" ? t("cart.weekly") : item.subFrequency === "biweekly" ? t("cart.biweekly") : t("cart.monthly")}
                          </span>
                        )}
                        {item.unitPrice !== undefined && item.unitPrice < item.product.price && item.purchaseMode !== "subscribe" && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 px-1.5 py-0.5 rounded">
                            🏷 {t("cart.bulk_discount")}
                          </span>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem.mutate(item.id)}
                        disabled={removeItem.isPending}
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

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.subtotal", "Subtotal")}</span>
                <span data-testid="text-subtotal">£{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.delivery", "Delivery")}</span>
                <span data-testid="text-delivery-fee">
                  {deliveryFee === 0 ? t("cart.free_delivery", "Free") : `£${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("checkout.vat", "VAT")}</span>
                <span data-testid="text-cart-tax">£{tax.toFixed(2)}</span>
              </div>
              {deliveryFee > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("cart.add_more_for_free", { amount: (FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2) })}
                </p>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>{t("cart.total", "Total")}</span>
                <span data-testid="text-total">£{total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              className="w-full mt-4 gap-2"
              size="lg"
              onClick={handleCheckout}
              data-testid="button-checkout"
            >
              {isAuthenticated
                ? `${t("cart.checkout", "Proceed to Checkout")} • £${total.toFixed(2)}`
                : t("cart.login_to_checkout", "Sign in to checkout")}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => setLocation("/")}
              data-testid="button-continue-shopping"
            >
              {t("cart.continue_shopping", "Continue Shopping")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
