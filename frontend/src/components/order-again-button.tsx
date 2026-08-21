import { useState, type MouseEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, ShoppingCart, XCircle } from "lucide-react";
import type { ReorderItemResult, ReorderOrderResult } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToastAction } from "@/components/ui/toast";
import { useCurrency } from "@/contexts/currency-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

type OrderAgainButtonProps = {
  orderId: string;
  productIds?: string[];
  label?: string;
  className?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  testId?: string;
};

function resultTone(item: ReorderItemResult): string {
  if (item.status === "added") return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100";
  if (!item.canAdd) return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200";
  if (item.requiresConfirmation) return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100";
  return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100";
}

export function OrderAgainButton({
  orderId,
  productIds,
  label = "Order again",
  className,
  size = "sm",
  variant = "outline",
  testId,
}: OrderAgainButtonProps) {
  const { format } = useCurrency();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [preview, setPreview] = useState<ReorderOrderResult | null>(null);

  const addMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/reorder`, {
        action: "add_available",
        ...(productIds ? { productIds } : {}),
      });
      return response.json() as Promise<ReorderOrderResult>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      const failures = result.items.filter((item) => item.status === "add_failed");
      if (result.addedItemCount > 0) {
        toast({
          title: result.addedItemCount === 1 ? "Item added to cart" : "Items added to cart",
          description: `${result.addedQuantity} unit${result.addedQuantity === 1 ? "" : "s"} added using current prices and availability.`,
          action: <ToastAction altText="View cart" onClick={() => navigate("/cart")}>View cart</ToastAction>,
        });
      }
      if (failures.length > 0 || result.addedItemCount === 0) {
        setPreview(result);
        if (result.addedItemCount === 0) {
          toast({
            title: "Nothing was added",
            description: failures[0]?.message || "The selected products are no longer available.",
            variant: "destructive",
          });
        }
      } else {
        setPreview(null);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Could not update the cart", description: error.message, variant: "destructive" });
    },
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/reorder`, {
        action: "validate",
        ...(productIds ? { productIds } : {}),
      });
      return response.json() as Promise<ReorderOrderResult>;
    },
    onSuccess: (result) => {
      if (result.allAvailable) addMutation.mutate();
      else setPreview(result);
    },
    onError: (error: Error) => {
      toast({ title: "Could not check this order", description: error.message, variant: "destructive" });
    },
  });

  const isPending = validateMutation.isPending || addMutation.isPending;
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    validateMutation.mutate();
  };
  const canAddFromPreview = Boolean(preview?.items.some((item) => item.canAdd && item.quantityToAdd > 0));

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn("gap-1.5", className)}
        onClick={handleClick}
        disabled={isPending}
        data-testid={testId ?? `button-order-again-${orderId}`}
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        {isPending ? "Checking…" : label}
      </Button>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && !addMutation.isPending && setPreview(null)}>
        <DialogContent className="sm:max-w-xl" data-testid="dialog-order-again-review">
          <DialogHeader>
            <DialogTitle>Review current availability</DialogTitle>
            <DialogDescription>
              Your previous order is preserved. The cart will use today’s prices, sellers, and available stock.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="max-h-[55dvh] space-y-2 overflow-y-auto pr-1">
              {preview.items.map((item) => (
                <div key={item.productId} className={cn("rounded-xl border p-3", resultTone(item))}>
                  <div className="flex items-start gap-3">
                    {item.status === "added" || (item.canAdd && !item.requiresConfirmation)
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      : item.canAdd
                        ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="truncate text-sm font-extrabold">{item.productName}</p>
                        <Badge variant="outline" className="bg-background/60 text-[10px]">
                          {item.status === "added" ? "Added" : item.canAdd ? `${item.quantityToAdd} to add` : "Unavailable"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs font-medium">{item.message}</p>
                      {item.currentPrice != null && Math.abs(item.currentPrice - item.originalPrice) >= 0.005 && (
                        <p className="mt-1 text-xs">
                          Price changed from <span className="line-through">{format(item.originalPrice, { includeCode: true })}</span>{" "}
                          to <span className="font-extrabold">{format(item.currentPrice, { includeCode: true })}</span>
                        </p>
                      )}
                      {item.currentSellerId && item.currentSellerId !== item.originalSellerId && (
                        <p className="mt-1 text-xs">
                          Seller changed from <span className="font-semibold">{item.originalSellerName}</span> to{" "}
                          <span className="font-extrabold">{item.currentSellerName || "the current seller"}</span>
                        </p>
                      )}
                      {item.productName !== item.originalProductName && (
                        <p className="mt-1 text-xs">
                          Product name changed from <span className="font-semibold">{item.originalProductName}</span>.
                        </p>
                      )}
                      {item.existingCartQuantity > 0 && (
                        <p className="mt-1 text-xs">Already in cart: {item.existingCartQuantity}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreview(null)} disabled={addMutation.isPending}>
              Close
            </Button>
            {canAddFromPreview && (
              <Button
                type="button"
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending}
                className="gap-1.5"
                data-testid="button-confirm-order-again"
              >
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                Add available items
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
