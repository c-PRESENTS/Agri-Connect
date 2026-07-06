import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Cart, CartItem, Product } from "@shared/schema";

const CART_KEY = ["/api/cart"];

export function useCart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const cartQuery = useQuery<Cart>({
    queryKey: CART_KEY,
    staleTime: 30 * 1000,
  });

  const items: CartItem[] = cartQuery.data?.items ?? [];
  const total = cartQuery.data?.total ?? 0;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: CART_KEY });

  const addItem = useMutation({
    mutationFn: async (input: { product: Product; quantity?: number }) => {
      const res = await apiRequest("POST", "/api/cart", {
        productId: input.product.id,
        quantity: input.quantity ?? 1,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      invalidate();
      toast({
        title: "Added to cart",
        description: variables.product.name,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't add to cart",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateItem = useMutation({
    mutationFn: async (input: { itemId: string; quantity: number }) => {
      if (input.quantity <= 0) {
        await apiRequest("DELETE", `/api/cart/${input.itemId}`);
        return { deleted: true };
      }
      const res = await apiRequest("PATCH", `/api/cart/${input.itemId}`, {
        quantity: input.quantity,
      });
      return res.json();
    },
    onSuccess: invalidate,
    onError: () =>
      toast({ title: "Couldn't update cart", variant: "destructive" }),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/cart/${itemId}`);
    },
    onSuccess: invalidate,
    onError: () =>
      toast({ title: "Couldn't remove item", variant: "destructive" }),
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/cart");
    },
    onSuccess: invalidate,
  });

  return {
    items,
    total,
    itemCount,
    isLoading: cartQuery.isLoading,
    addItem,
    updateItem,
    removeItem,
    clearCart,
  };
}
