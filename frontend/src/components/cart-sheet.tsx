import { useTranslation } from "react-i18next";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CartItem } from "@shared/schema";

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  currencySymbol?: string;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
}

export function CartSheet({
  isOpen,
  onClose,
  items,
  currencySymbol = "£",
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartSheetProps) {
  const { t } = useTranslation();
  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const deliveryFee = subtotal >= 30 || subtotal === 0 ? 0 : 4.99;
  const total = subtotal + deliveryFee;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col backdrop-blur-2xl bg-background/95 dark:bg-background/90 dark:border-white/[0.06]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            {t("cart_sheet.title")}
            {items.length > 0 && (
              <Badge variant="secondary">{t("cart_sheet.item_count", { count: items.length })}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">{t("cart_sheet.empty_description")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("cart.empty_description")}
            </p>
            <Button onClick={onClose} data-testid="button-continue-shopping">
              {t("cart_sheet.continue_shopping")}
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3" data-testid={`cart-item-${item.id}`}>
                    <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={item.product.images[0] || `https://placehold.co/80x80/22c55e/white?text=${encodeURIComponent(item.product.name[0])}`}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
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
                        <span className="font-semibold text-sm">
                          {currencySymbol}{item.product.price}/{item.product.unit}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() =>
                              item.quantity <= 1
                                ? onRemoveItem(item.id)
                                : onUpdateQuantity(item.id, item.quantity - 1)
                            }
                            data-testid={`button-decrease-${item.id}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                            data-testid={`button-increase-${item.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveItem(item.id)}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t pt-4 space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("cart_sheet.subtotal")}</span>
                  <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("cart.delivery")}</span>
                  <span>{deliveryFee === 0 ? t("cart.free_delivery") : `${currencySymbol}${deliveryFee}`}</span>
                </div>
                {deliveryFee > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("cart.add_more_for_free", { amount: (30 - subtotal).toFixed(2) })}
                  </p>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>{t("cart.total")}</span>
                  <span>{currencySymbol}{total.toFixed(2)}</span>
                </div>
              </div>

              <SheetFooter className="flex gap-2 sm:flex-col">
                <Button className="w-full btn-glow" size="lg" onClick={onCheckout} data-testid="button-checkout">
                  {t("cart_sheet.checkout_button")}
                </Button>
                <Button variant="outline" className="w-full" onClick={onClose} data-testid="button-continue-shopping-footer">
                  {t("cart_sheet.continue_shopping")}
                </Button>
              </SheetFooter>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
