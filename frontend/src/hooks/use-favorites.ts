import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

type FavoriteState = {
  productIds: string[];
  sellerIds: string[];
};

const EMPTY_FAVORITES: FavoriteState = { productIds: [], sellerIds: [] };

function storageKey(userId: string) {
  return `agriconnect-favorites:${userId}`;
}

function readFavorites(userId: string | null): FavoriteState {
  if (!userId) return EMPTY_FAVORITES;

  try {
    const stored = localStorage.getItem(storageKey(userId));
    if (!stored) return EMPTY_FAVORITES;

    const parsed = JSON.parse(stored) as Partial<FavoriteState>;
    return {
      productIds: Array.isArray(parsed.productIds) ? [...new Set(parsed.productIds)] : [],
      sellerIds: Array.isArray(parsed.sellerIds) ? [...new Set(parsed.sellerIds)] : [],
    };
  } catch {
    return EMPTY_FAVORITES;
  }
}

export function useFavorites() {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? null;
  const [favorites, setFavorites] = useState<FavoriteState>(() => readFavorites(userId));

  useEffect(() => {
    setFavorites(readFavorites(userId));
  }, [userId]);

  useEffect(() => {
    const handleChange = () => setFavorites(readFavorites(userId));
    window.addEventListener("agriconnect-favorites-changed", handleChange);
    return () => window.removeEventListener("agriconnect-favorites-changed", handleChange);
  }, [userId]);

  const saveFavorites = useCallback((next: FavoriteState) => {
    if (!userId) return false;

    const normalized = {
      productIds: [...new Set(next.productIds)],
      sellerIds: [...new Set(next.sellerIds)],
    };

    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(normalized));
      setFavorites(normalized);
      window.dispatchEvent(new CustomEvent("agriconnect-favorites-changed", { detail: normalized }));
      return true;
    } catch {
      return false;
    }
  }, [userId]);

  const toggleProduct = useCallback((productId: string) => {
    if (!isAuthenticated) return null;
    const productIds = new Set(favorites.productIds);
    const added = !productIds.has(productId);
    if (added) productIds.add(productId);
    else productIds.delete(productId);
    return saveFavorites({ ...favorites, productIds: [...productIds] }) ? added : null;
  }, [favorites, isAuthenticated, saveFavorites]);

  const toggleSeller = useCallback((sellerId: string) => {
    if (!isAuthenticated) return null;
    const sellerIds = new Set(favorites.sellerIds);
    const added = !sellerIds.has(sellerId);
    if (added) sellerIds.add(sellerId);
    else sellerIds.delete(sellerId);
    return saveFavorites({ ...favorites, sellerIds: [...sellerIds] }) ? added : null;
  }, [favorites, isAuthenticated, saveFavorites]);

  return {
    isAuthenticated,
    productIds: favorites.productIds,
    sellerIds: favorites.sellerIds,
    isProductFavorite: (productId: string) => favorites.productIds.includes(productId),
    isSellerFavorite: (sellerId: string) => favorites.sellerIds.includes(sellerId),
    toggleProduct,
    toggleSeller,
  };
}
