import type { Express, Request, Response } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  cartItemInputSchema,
  cartShippingQuotesRequestSchema,
  updateCartItemSchema,
} from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { storage } from "../../storage";
import { calculateQuotesFromCoords, geocodePostcode } from "../../shipping/quote-engine";

type CartRouteDeps = {
  getUserId: (req: Request) => string | undefined;
  getUserIdOrSession: (req: Request) => string;
  touchGuestSession: (req: Request) => void;
  mergeGuestCartIfNeeded: (req: Request) => Promise<void>;
};

function handleZod(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(400).json({ error: fromZodError(err).message });
    return true;
  }
  return false;
}

export function registerCartRoutes(app: Express, deps: CartRouteDeps): void {
  app.get("/api/cart", async (req, res) => {
    try {
      await deps.mergeGuestCartIfNeeded(req);
      const userId = deps.getUserIdOrSession(req);
      const cart = await storage.getCart(userId);
      const total = cart.reduce((acc, item) => acc + (item.unitPrice ?? item.product?.price ?? 0) * item.quantity, 0);
      res.json({ items: cart, total });
    } catch {
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      deps.touchGuestSession(req);
      await deps.mergeGuestCartIfNeeded(req);
      const { productId, quantity, unitPrice, purchaseMode, subFrequency } = cartItemInputSchema.parse(req.body);
      const userId = deps.getUserIdOrSession(req);
      const item = await storage.addToCart(userId, productId, quantity, { unitPrice, purchaseMode, subFrequency });
      res.status(201).json(item);
    } catch (error: any) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: error.message || "Failed to add to cart" });
    }
  });

  app.patch("/api/cart/:itemId", async (req, res) => {
    try {
      deps.touchGuestSession(req);
      const userId = deps.getUserIdOrSession(req);
      const { quantity } = updateCartItemSchema.parse(req.body);
      const item = await storage.updateCartItem(userId, req.params.itemId, quantity);
      if (!item && quantity > 0) {
        return res.status(404).json({ error: "Cart item not found" });
      }
      res.json(item || { deleted: true });
    } catch (error) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:itemId", async (req, res) => {
    try {
      deps.touchGuestSession(req);
      const userId = deps.getUserIdOrSession(req);
      const deleted = await storage.removeFromCart(userId, req.params.itemId);
      if (!deleted) {
        return res.status(404).json({ error: "Cart item not found" });
      }
      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Failed to remove cart item" });
    }
  });

  app.delete("/api/cart", async (req, res) => {
    try {
      deps.touchGuestSession(req);
      const userId = deps.getUserIdOrSession(req);
      await storage.clearCart(userId);
      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });

  app.post("/api/cart/validate", isAuthenticated, async (req, res) => {
    try {
      deps.touchGuestSession(req);
      const userId = deps.getUserIdOrSession(req);
      const cart = await storage.getCart(userId);
      const result = await storage.validateCart(
        cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to validate cart" });
    }
  });

  app.post("/api/cart/shipping-quotes", isAuthenticated, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      const { drop } = cartShippingQuotesRequestSchema.parse(req.body);
      const cart = await storage.getCart(userId);
      if (!cart || cart.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      const groups = new Map<string, {
        farmerId: string;
        farmerName: string;
        farmerLocation: string;
        farmerLat: number;
        farmerLng: number;
        items: { name: string; quantity: number; weightKg: number; coldChain?: boolean; fragile?: boolean; productId: string; price: number }[];
      }>();
      for (const it of cart) {
        const fid = it.product.farmerId;
        if (!groups.has(fid)) {
          groups.set(fid, {
            farmerId: fid,
            farmerName: it.product.farmerName,
            farmerLocation: it.product.farmerLocation,
            farmerLat: it.product.farmerLatitude,
            farmerLng: it.product.farmerLongitude,
            items: [],
          });
        }
        const cat = it.product.categoryId.toLowerCase();
        const isCold = /dairy|meat|seafood|frozen/.test(cat);
        const isFragile = /egg|berry|tomato/.test(it.product.name.toLowerCase());
        const weightPerUnit = /grain|flour|feed|hay/.test(cat) ? 1.0 : 0.5;
        groups.get(fid)!.items.push({
          name: it.product.name,
          quantity: it.quantity,
          weightKg: weightPerUnit,
          coldChain: isCold,
          fragile: isFragile,
          productId: it.productId,
          price: it.unitPrice ?? it.product.price,
        });
      }

      const dropLL = geocodePostcode({ postcode: drop.postcode, country: drop.country });
      const result = Array.from(groups.values()).map((g) => {
        const refined = calculateQuotesFromCoords({
          pickup: { lat: g.farmerLat, lng: g.farmerLng, country: "GB" },
          drop: { lat: dropLL.lat, lng: dropLL.lng, country: drop.country },
          items: g.items.map((i) => ({ name: i.name, quantity: i.quantity, weightKg: i.weightKg, coldChain: i.coldChain, fragile: i.fragile })),
        });
        return {
          farmerId: g.farmerId,
          farmerName: g.farmerName,
          farmerLocation: g.farmerLocation,
          itemCount: g.items.reduce((s, i) => s + i.quantity, 0),
          weightKg: refined.weightKg,
          distanceKm: refined.distanceKm,
          quotes: refined.quotes,
        };
      });

      const totalCheapest = result.reduce((s, g) => s + (g.quotes[0]?.price ?? 0), 0);
      res.json({ groups: result, totalCheapest, currency: "GBP" });
    } catch (err) {
      if (handleZod(err, res)) return;
      console.error("[cart/shipping-quotes] error", err);
      res.status(500).json({ error: "Failed to calculate cart shipping quotes" });
    }
  });
}
