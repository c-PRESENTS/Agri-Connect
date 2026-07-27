import type { ComponentProps, MouseEvent } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type FavoriteProductButtonProps = Omit<ComponentProps<typeof Button>, "children" | "onClick"> & {
  productId: string;
  productName: string;
  showLabel?: boolean;
  onToggle?: (added: boolean) => void;
};

export function FavoriteProductButton({
  productId,
  productName,
  showLabel = false,
  onToggle,
  className,
  variant = "secondary",
  size = "icon",
  ...buttonProps
}: FavoriteProductButtonProps) {
  const { isAuthenticated, isProductFavorite, toggleProduct } = useFavorites();
  const { toast } = useToast();
  const isFavorite = isProductFavorite(productId);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const added = toggleProduct(productId);
    if (added === null) {
      toast({
        title: "Sign in to save favorites",
        description: "Favorites are available for signed-in buyers and farmers.",
      });
      return;
    }

    onToggle?.(added);
    toast({ title: added ? "Added to favorites" : "Removed from favorites" });
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Remove ${productName} from favorites` : `Add ${productName} to favorites`}
      title={isAuthenticated ? (isFavorite ? "Remove from favorites" : "Add to favorites") : "Sign in to save favorites"}
      className={cn(
        "shrink-0 transition-colors",
        showLabel ? "gap-2" : "rounded-full",
        isFavorite && "border-red-300 text-red-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30",
        className,
      )}
      data-testid={`button-favorite-${productId}`}
      {...buttonProps}
    >
      <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
      {showLabel && (isFavorite ? "Saved to favorites" : "Add to favorites")}
    </Button>
  );
}
