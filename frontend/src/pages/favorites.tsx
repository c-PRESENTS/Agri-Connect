import { Heart, Package, Store } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TopNavigation } from "@/components/top-navigation";
import { ProductCard } from "@/components/product-card";
import { useFavorites } from "@/hooks/use-favorites";
import type { Product } from "@shared/schema";

export default function FavoritesPage() {
  const [, setLocation] = useLocation();
  const { productIds, sellerIds, toggleSeller } = useFavorites();
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const favoriteProducts = products.filter((product) => productIds.includes(product.id));
  const favoriteSellers = sellerIds
    .map((sellerId) => products.find((product) => product.farmerId === sellerId))
    .filter((seller): seller is Product => Boolean(seller));

  const isEmpty = productIds.length === 0 && sellerIds.length === 0;

  return (
    <div>
      <TopNavigation />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 fill-red-500 text-red-500" />
              <h1 className="text-2xl font-bold" data-testid="heading-favorites">Favorites</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Saved products and sellers for your signed-in account on this device.
            </p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-browse-products">
            Browse products
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading favorites...</p>
        ) : isEmpty ? (
          <Card data-testid="favorites-empty-state">
            <CardContent className="flex flex-col items-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Heart className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">No favorites yet</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Save products or sellers to find them quickly here.
              </p>
              <Button className="mt-5" onClick={() => setLocation("/")} data-testid="button-empty-state-browse">
                Browse products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {sellerIds.length > 0 && (
              <section aria-labelledby="favorite-sellers-heading">
                <div className="mb-3 flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  <h2 id="favorite-sellers-heading" className="text-lg font-semibold">Favorite sellers</h2>
                </div>
                {favoriteSellers.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {favoriteSellers.map((seller) => (
                      <Card key={seller.farmerId} data-testid={`favorite-seller-${seller.farmerId}`}>
                        <CardContent className="flex items-center gap-3 p-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Store className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link href={`/sellers/${seller.farmerId}`} className="font-semibold hover:text-primary hover:underline">
                              {seller.farmerName}
                            </Link>
                            <p className="truncate text-sm text-muted-foreground">{seller.farmerLocation || "Location not specified"}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleSeller(seller.farmerId)}
                            aria-label={`Remove ${seller.farmerName} from favorites`}
                            data-testid={`button-remove-favorite-seller-${seller.farmerId}`}
                          >
                            <Heart className="h-4 w-4 fill-current text-red-500" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="favorites-sellers-unavailable">
                    Saved seller details will appear when their listings are available.
                  </p>
                )}
              </section>
            )}

            {productIds.length > 0 && (
              <section aria-labelledby="favorite-products-heading">
                <div className="mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h2 id="favorite-products-heading" className="text-lg font-semibold">Favorite products</h2>
                </div>
                {favoriteProducts.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                    {favoriteProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onClick={(selectedProduct) => setLocation(`/products/${selectedProduct.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="favorites-products-unavailable">
                    Saved product details will appear when those products are available.
                  </p>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
