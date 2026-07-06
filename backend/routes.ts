import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import type { ProductFilters, OrderItem, OrderStatus, InsertReview } from "@shared/schema";
import {
  insertProductSchema,
  cartItemInputSchema,
  updateCartItemSchema,
  createOrderSchema,
  insertReviewSchema,
  schemeApplicationSchema,
  supportTicketSchema,
  quoteShipmentSchema,
  bookShipmentSchema,
  cartShippingQuotesRequestSchema,
} from "@shared/schema";
import type { Order, Shipment, ShipServiceType } from "@shared/schema";
import { calculateQuotes, calculateQuotesFromCoords, rateCardById, geocodePostcode } from "./shipping/quote-engine";
import { getAdapter } from "./shipping/adapters";
import { notify, buildShipmentBookedEmail } from "./notifications";
import { isAuthenticated } from "./auth";
import { authStorage } from "./auth/storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import OpenAI from "openai";
import { createAIService, normalizeLang } from "./ai";
import { generateGeminiContent, isGeminiAvailable } from "./ai/gemini";
import { getStripe, getWebhookSecret } from "./stripe";
import type Stripe from "stripe";

function getUserId(req: Request): string | undefined {
  return req.session?.userId;
}

function getUserIdOrSession(req: Request): string {
  return getUserId(req) ?? `session_${req.sessionID}`;
}

// Touching the session forces express-session to persist a cookie even when
// `saveUninitialized: false` is set. Required for guest carts so the same
// session ID survives across requests; otherwise every request gets a fresh
// sessionID and the cart appears empty on the next read.
function touchGuestSession(req: Request): void {
  if (getUserId(req)) return;
  (req.session as any).guest = true;
}

// Merge any guest-session cart into the user's cart on the first authed request.
// Idempotent: clears the guest key after merging.
async function mergeGuestCartIfNeeded(req: Request): Promise<void> {
  const userId = getUserId(req);
  if (!userId) return;
  const guestKey = `session_${req.sessionID}`;
  if (guestKey === userId) return;
  try {
    await storage.mergeGuestCart(guestKey, userId);
  } catch {
    // non-fatal
  }
}

// Tiny in-memory per-key rate limiter (sliding window).
const rateBuckets = new Map<string, number[]>();
// Periodic cleanup so the map doesn't grow unbounded (every 10 min, drop empty/stale keys).
setInterval(() => {
  const cutoff = Date.now() - 10 * 60_000;
  for (const [k, arr] of Array.from(rateBuckets.entries())) {
    const fresh = arr.filter((t: number) => t > cutoff);
    if (fresh.length === 0) rateBuckets.delete(k);
    else rateBuckets.set(k, fresh);
  }
}, 10 * 60_000).unref?.();

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const arr = (rateBuckets.get(key) || []).filter((t) => t > cutoff);
  if (arr.length >= limit) {
    rateBuckets.set(key, arr);
    return false;
  }
  arr.push(now);
  rateBuckets.set(key, arr);
  return true;
}
function aiRateLimit(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `ai:${getUserId(req) ?? req.ip}`;
    if (!rateLimit(key, limit, windowMs)) {
      return res.status(429).json({ error: "Too many requests, please slow down." });
    }
    next();
  };
}

function resolveStripeOrigin(req: Request): string {
  const allowList = (process.env.APP_ORIGINS || process.env.PUBLIC_APP_URL || "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((origin) => (origin.startsWith("http://") || origin.startsWith("https://") ? origin : `https://${origin}`));
  const requested = (req.headers.origin as string) || "";
  if (allowList.length > 0) {
    if (requested && allowList.includes(requested)) return requested;
    return allowList[0];
  }
  // No allow-list configured (local dev only): fall back to the request host.
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_ORIGINS or PUBLIC_APP_URL is not configured");
  }
  return `${req.protocol}://${req.get("host")}`;
}

function handleZod(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(400).json({ error: fromZodError(err).message });
    return true;
  }
  return false;
}

/**
 * Auto-create one Shipment per farmer for a paid order, using the buyer's
 * shipping selections captured at checkout. Idempotent: if shipments already
 * exist for the order it is a no-op. Failures are logged but do not throw —
 * a missing shipment is recoverable manually, but a thrown error here would
 * break the Stripe webhook ack and cause Stripe to retry forever.
 */
// In-process lock map to prevent webhook + session/:id from racing into
// double-shipment creation for the same order.
const ensureShipmentsLocks = new Map<string, Promise<Shipment[]>>();
async function ensureShipmentsForOrder(order: Order, origin: string): Promise<Shipment[]> {
  if (!order.shippingChoices || !order.deliveryAddressStruct) return [];
  const inflight = ensureShipmentsLocks.get(order.id);
  if (inflight) return inflight;
  const promise = ensureShipmentsForOrderInner(order, origin)
    .finally(() => { ensureShipmentsLocks.delete(order.id); });
  ensureShipmentsLocks.set(order.id, promise);
  return promise;
}

async function ensureShipmentsForOrderInner(order: Order, origin: string): Promise<Shipment[]> {
  const existing = await storage.listShipmentsByOrder(order.id);
  if (existing.length > 0) return existing;

  const shippingChoices = order.shippingChoices;
  const drop = order.deliveryAddressStruct;
  if (!shippingChoices || !drop) return [];
  const dropLL = geocodePostcode({ postcode: drop.postcode, country: drop.country });
  const itemsByFarmer = new Map<string, OrderItem[]>();
  for (const oi of order.items) {
    if (!itemsByFarmer.has(oi.farmerId)) itemsByFarmer.set(oi.farmerId, []);
    itemsByFarmer.get(oi.farmerId)!.push(oi);
  }

  const created: Shipment[] = [];
  for (const [farmerId, items] of Array.from(itemsByFarmer.entries())) {
    const choice = shippingChoices[farmerId];
    if (!choice) {
      console.warn(`[order/auto-ship] no shipping choice for farmer ${farmerId} on order ${order.id}`);
      continue;
    }
    if (!rateCardById(choice.partnerId)) {
      console.warn(`[order/auto-ship] unknown partner ${choice.partnerId}`);
      continue;
    }
    // Resolve every item's product so traits (cold-chain, fragile, weight) come
    // from the actual product, not just the first item — needed for parity with
    // the cart-quote endpoint when one farmer ships mixed categories.
    const resolved = await Promise.all(items.map(async (it: OrderItem) => ({ it, product: await storage.getProduct(it.productId) })));
    const firstProduct = resolved.find((r) => r.product)?.product;
    if (!firstProduct) continue;
    const shipItems = resolved
      .filter((r) => r.product)
      .map(({ it, product }) => {
        const cat = (product!.categoryId || "").toLowerCase();
        const isCold = /dairy|meat|seafood|frozen/.test(cat);
        const isFragile = /egg|berry|tomato/.test(it.productName.toLowerCase());
        const weightPerUnit = /grain|flour|feed|hay/.test(cat) ? 1.0 : 0.5;
        return {
          name: it.productName,
          category: product!.categoryId,
          quantity: it.quantity,
          weightKg: weightPerUnit,
          coldChain: isCold,
          fragile: isFragile,
          declaredValue: Math.round(it.price * it.quantity * 100) / 100,
        };
      });

    const recomputed = calculateQuotesFromCoords({
      pickup: { lat: firstProduct.farmerLatitude, lng: firstProduct.farmerLongitude, country: "GB" },
      drop: { lat: dropLL.lat, lng: dropLL.lng, country: drop.country },
      items: shipItems,
      service: choice.service,
    });
    const matched = recomputed.quotes.find((q) => q.partnerId === choice.partnerId && q.service === choice.service)
      ?? recomputed.quotes[0];
    if (!matched) {
      console.warn(`[order/auto-ship] no eligible quote for farmer ${farmerId} order ${order.id}`);
      continue;
    }

    try {
      const shipment = await storage.createShipment({
        orderId: order.id,
        senderId: farmerId,
        receiverId: order.buyerId,
        partnerId: matched.partnerId,
        partnerName: matched.partnerName,
        service: matched.service,
        pickup: {
          name: firstProduct.farmerName,
          phone: drop.phone, // farmer phone not denormalised; use buyer for callback
          line1: firstProduct.farmerLocation || "Farm",
          city: firstProduct.farmerLocation || "Farm",
          postcode: "FA RM",
          country: "GB",
          lat: firstProduct.farmerLatitude,
          lng: firstProduct.farmerLongitude,
        },
        drop: {
          name: drop.name,
          phone: drop.phone,
          email: drop.email,
          line1: drop.line1,
          line2: drop.line2,
          city: drop.city,
          postcode: drop.postcode,
          country: drop.country,
          lat: dropLL.lat,
          lng: dropLL.lng,
        },
        items: shipItems,
        distanceKm: recomputed.distanceKm,
        weightKg: recomputed.weightKg,
        price: matched.price,
        currency: matched.currency,
        eta: new Date(Date.now() + matched.etaHours * 3600_000).toISOString(),
        notifyEmail: drop.email ?? order.buyerEmail,
        notifyWhatsapp: drop.phone,
      });

      // Hand off to the carrier adapter
      try {
        const adapter = getAdapter(matched.partnerId);
        const ref = await adapter.bookShipment(shipment);
        const updated = await storage.setShipmentCarrierRef(shipment.id, ref);
        const finalShipment = updated ?? shipment;
        await storage.addShipmentEvent({
          shipmentId: shipment.id,
          status: shipment.status,
          location: shipment.pickup.city,
          note: `Label generated · ${matched.partnerName}${ref.externalTrackingNumber ? ` · ${ref.externalTrackingNumber}` : ""}${ref.live ? "" : " (simulated)"}`,
          source: "partner_api",
        });
        // Notify the buyer for this farmer's parcel
        if (drop.email || drop.phone) {
          const trackUrl = `${origin}/ship/track/${finalShipment.trackingId}`;
          const { subject, body, shortBody } = buildShipmentBookedEmail(finalShipment, trackUrl);
          notify({
            to: { email: drop.email ?? order.buyerEmail, whatsapp: drop.phone },
            subject, body, shortBody, shipment: finalShipment,
          }).catch((e) => console.warn("[order/auto-ship] notify failed", e));
        }
        created.push(finalShipment);
      } catch (adapterErr) {
        console.warn("[order/auto-ship] adapter failed", (adapterErr as Error).message);
        created.push(shipment);
      }
    } catch (shipErr) {
      console.warn(`[order/auto-ship] createShipment failed for farmer ${farmerId} on order ${order.id}`, shipErr);
    }
  }
  return created;
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const ai = createAIService(openai);

const SEARCH_SYNONYMS: Record<string, string[]> = {
  veggie: ["vegetable", "vegetables"],
  veggies: ["vegetable", "vegetables"],
  veg: ["vegetable", "vegetables"],
  taters: ["potato", "potatoes"],
  aloo: ["potato", "potatoes"],
  doodh: ["milk", "dairy"],
  atta: ["flour", "wheat"],
  pyaz: ["onion", "onions"],
  tamatar: ["tomato", "tomatoes"],
  organic: ["organic", "natural"],
  fruit: ["fruit", "fruits"],
};

function parseJsonObject(raw: string): Record<string, any> {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(cleaned || "{}") as Record<string, any>;
}

function inferSearchExpansion(query: string): { expandedQuery: string; category: string | null; intent: "search" | "browse" } {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = new Set(words);
  for (const word of words) {
    SEARCH_SYNONYMS[word]?.forEach((term) => expanded.add(term));
  }

  const joined = Array.from(expanded).join(" ");
  let category: string | null = null;
  if (/\b(seed|fertili[sz]er|tool|tractor|glove|pesticide|feed)\b/.test(joined)) category = "inputs-tools";
  else if (/\b(milk|dairy|egg|vegetable|fruit|grain|rice|wheat|tomato|potato|onion|apple|carrot)\b/.test(joined)) category = "daily-needs";
  else if (/\b(jam|pickle|oil|flour|snack|bread|processed)\b/.test(joined)) category = "processed";
  else if (/\b(hydroponic|greenhouse|sensor|drone|smart|agritech)\b/.test(joined)) category = "modern-farming";
  else if (/\b(transport|service|irrigation|advisory|logistics)\b/.test(joined)) category = "services";

  const intent: "search" | "browse" = /\b(show|browse|list|all|available|category|categories)\b/.test(joined) ? "browse" : "search";
  return { expandedQuery: joined || query, category, intent };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const filters: ProductFilters = {};
      
      if (req.query.categoryId) filters.categoryId = req.query.categoryId as string;
      if (req.query.subcategoryId) filters.subcategoryId = req.query.subcategoryId as string;
      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.isOrganic === "true") filters.isOrganic = true;
      if (req.query.inStock === "true") filters.inStock = true;
      if (req.query.distance) filters.distance = parseInt(req.query.distance as string);
      if (req.query.rating) filters.rating = parseFloat(req.query.rating as string);
      if (req.query.minPrice) filters.minPrice = parseFloat(req.query.minPrice as string);
      if (req.query.maxPrice) filters.maxPrice = parseFloat(req.query.maxPrice as string);
      if (req.query.sortBy) filters.sortBy = req.query.sortBy as ProductFilters["sortBy"];

      const products = await storage.getProducts(filters);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData as any, userId);
      res.status(201).json(product);
    } catch (error) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const existing = await storage.getProduct(req.params.id);
      if (!existing) return res.status(404).json({ error: "Product not found" });
      if (existing.farmerId !== userId) return res.status(403).json({ error: "Access denied" });
      const updates = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, updates as any);
      res.json(product);
    } catch (error) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const existing = await storage.getProduct(req.params.id);
      if (!existing) return res.status(404).json({ error: "Product not found" });
      if (existing.farmerId !== userId) return res.status(403).json({ error: "Access denied" });
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Farmer products
  app.get("/api/farmers/:farmerId/products", async (req, res) => {
    try {
      const products = await storage.getProductsByFarmer(req.params.farmerId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch farmer products" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  // Cart — guests get a session-bound cart; signed-in users get a persistent one.
  // On any cart access, opportunistically merge a guest-session cart into the user's cart.
  app.get("/api/cart", async (req, res) => {
    try {
      await mergeGuestCartIfNeeded(req);
      const userId = getUserIdOrSession(req);
      const cart = await storage.getCart(userId);
      const total = cart.reduce((acc, item) => acc + (item.unitPrice ?? item.product.price) * item.quantity, 0);
      res.json({ items: cart, total });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      touchGuestSession(req);
      await mergeGuestCartIfNeeded(req);
      const { productId, quantity, unitPrice, purchaseMode, subFrequency } = cartItemInputSchema.parse(req.body);
      const userId = getUserIdOrSession(req);
      const item = await storage.addToCart(userId, productId, quantity, { unitPrice, purchaseMode, subFrequency });
      res.status(201).json(item);
    } catch (error: any) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: error.message || "Failed to add to cart" });
    }
  });

  app.patch("/api/cart/:itemId", async (req, res) => {
    try {
      touchGuestSession(req);
      const userId = getUserIdOrSession(req);
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
      touchGuestSession(req);
      const userId = getUserIdOrSession(req);
      const deleted = await storage.removeFromCart(userId, req.params.itemId);
      if (!deleted) {
        return res.status(404).json({ error: "Cart item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove cart item" });
    }
  });

  app.delete("/api/cart", async (req, res) => {
    try {
      touchGuestSession(req);
      const userId = getUserIdOrSession(req);
      await storage.clearCart(userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });

  // Validate the current cart against live stock (used before checkout).
  app.post("/api/cart/validate", async (req, res) => {
    try {
      touchGuestSession(req);
      const userId = getUserIdOrSession(req);
      const cart = await storage.getCart(userId);
      const result = await storage.validateCart(
        cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to validate cart" });
    }
  });

  // Orders (require authentication)
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getOrders(getUserId(req)!);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.buyerId !== userId) return res.status(403).json({ error: "Access denied" });
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const parsed = createOrderSchema.parse(req.body);
      const order = await storage.createOrder(
        userId,
        parsed.items as OrderItem[],
        parsed.deliveryAddress,
        parsed.paymentMethod,
        parsed.deliveryMethod,
      );
      await storage.clearCart(userId);
      res.status(201).json(order);
    } catch (error) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // ===== Stripe Checkout =====
  app.post("/api/stripe/create-checkout-session", isAuthenticated, async (req, res) => {
    let createdOrderId: string | undefined;
    try {
      const userId = getUserId(req)!;
      const parsed = createOrderSchema.parse({ ...req.body, paymentMethod: "stripe" });

      // Cleanup: cancel any pending Stripe orders this user abandoned >30min ago.
      await storage.cancelStaleStripePendingOrders(userId);

      // Server-authoritative pricing: replace every cart item's price with the
      // canonical Product price so a tampered client can't underpay.
      const repricedItems: typeof parsed.items = [];
      for (const it of parsed.items) {
        const prod = await storage.getProduct(it.productId);
        if (!prod) {
          return res.status(400).json({ error: `Product no longer available: ${it.productName}` });
        }
        repricedItems.push({
          ...it,
          price: prod.price,
          farmerId: prod.farmerId,
          farmerName: prod.farmerName,
          productName: prod.name,
          productImage: prod.images?.[0] ?? it.productImage,
        });
      }
      parsed.items = repricedItems;

      // Carrier shipping is required for Stripe checkout — no choice means we
      // can't price or auto-create shipments authoritatively.
      if (!parsed.shippingChoices || !parsed.deliveryAddressStruct || Object.keys(parsed.shippingChoices).length === 0) {
        return res.status(400).json({ error: "Shipping selection required. Please choose carriers on the Shipping step." });
      }

      // Authoritatively price per-farmer shipping on the server using the
      // submitted shippingChoices + structured drop. The client-shown total
      // must match what we charge in Stripe.
      const shippingBreakdown: { farmerId: string; partnerId: string; service: string; price: number; partnerName: string }[] = [];
      let serverShippingTotal = 0;
      if (parsed.shippingChoices && parsed.deliveryAddressStruct && Object.keys(parsed.shippingChoices).length > 0) {
        const drop = parsed.deliveryAddressStruct;
        const dropLL = geocodePostcode({ postcode: drop.postcode, country: drop.country });
        const itemsByFarmer = new Map<string, typeof parsed.items>();
        for (const it of parsed.items) {
          if (!itemsByFarmer.has(it.farmerId)) itemsByFarmer.set(it.farmerId, []);
          itemsByFarmer.get(it.farmerId)!.push(it);
        }
        for (const [farmerId, items] of Array.from(itemsByFarmer.entries())) {
          const choice = parsed.shippingChoices[farmerId];
          if (!choice) continue;
          const resolved = await Promise.all(items.map(async (it: typeof parsed.items[number]) => ({ it, product: await storage.getProduct(it.productId) })));
          const firstProd = resolved.find((r) => r.product)?.product;
          if (!firstProd) continue;
          const shipItems = resolved.filter((r) => r.product).map(({ it, product }) => {
            const cat = (product!.categoryId || "").toLowerCase();
            const isCold = /dairy|meat|seafood|frozen/.test(cat);
            const isFragile = /egg|berry|tomato/.test(it.productName.toLowerCase());
            const weightPerUnit = /grain|flour|feed|hay/.test(cat) ? 1.0 : 0.5;
            return { name: it.productName, quantity: it.quantity, weightKg: weightPerUnit, coldChain: isCold, fragile: isFragile };
          });
          const recomputed = calculateQuotesFromCoords({
            pickup: { lat: firstProd.farmerLatitude, lng: firstProd.farmerLongitude, country: "GB" },
            drop: { lat: dropLL.lat, lng: dropLL.lng, country: drop.country },
            items: shipItems,
            service: choice.service,
          });
          const matched = recomputed.quotes.find((q) => q.partnerId === choice.partnerId && q.service === choice.service)
            ?? recomputed.quotes[0];
          if (!matched) continue;
          shippingBreakdown.push({ farmerId, partnerId: matched.partnerId, partnerName: matched.partnerName, service: matched.service, price: matched.price });
          serverShippingTotal += matched.price;
        }
        serverShippingTotal = parseFloat(serverShippingTotal.toFixed(2));
      }

      const order = await storage.createOrder(
        userId,
        parsed.items as OrderItem[],
        parsed.deliveryAddress,
        "stripe",
        parsed.deliveryMethod,
        {
          shippingChoices: parsed.shippingChoices,
          deliveryAddressStruct: parsed.deliveryAddressStruct,
          shippingTotal: serverShippingTotal,
        },
      );
      createdOrderId = order.id;

      const origin = resolveStripeOrigin(req);

      const stripe = getStripe();
      const profile = await authStorage.getUser(userId);

      const lineItems: any[] = parsed.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(item.price * 100),
          product_data: {
            name: item.productName,
            ...(item.productImage ? { images: [item.productImage] } : {}),
            metadata: { productId: item.productId, farmerId: item.farmerId },
          },
        },
      }));

      if (order.deliveryFee > 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: Math.round(order.deliveryFee * 100),
            product_data: { name: "Express delivery" },
          },
        });
      }
      // Per-farmer carrier shipping — one Stripe line item per parcel for clarity.
      for (const sb of shippingBreakdown) {
        if (sb.price <= 0) continue;
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: Math.round(sb.price * 100),
            product_data: { name: `Shipping · ${sb.partnerName} (${sb.service.replace("_", " ")})` },
          },
        });
      }
      if (order.tax > 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: Math.round(order.tax * 100),
            product_data: { name: "VAT (20%)" },
          },
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        customer_email: profile?.email ?? undefined,
        success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/payment/cancelled?order_id=${order.id}`,
        metadata: { orderId: order.id, userId },
        payment_intent_data: { metadata: { orderId: order.id, userId } },
      });

      await storage.setOrderStripeSession(order.id, session.id);

      res.json({ url: session.url, sessionId: session.id, orderId: order.id });
    } catch (error: any) {
      if (handleZod(error, res)) return;
      console.error("Stripe checkout session error:", error?.message || error);
      // Roll back the orphan order created moments ago, if any.
      if (createdOrderId) {
        try {
          await storage.markOrderPaymentFailed(createdOrderId, "Checkout session creation failed");
        } catch {
          // best-effort
        }
      }
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/stripe/session/:sessionId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const order = await storage.getOrderByStripeSession(req.params.sessionId);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.buyerId !== userId) return res.status(403).json({ error: "Forbidden" });

      // If webhook hasn't landed yet, fall back to a server-verified retrieval.
      if (order.paymentStatus === "pending") {
        try {
          const stripe = getStripe();
          const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
          if (session.payment_status === "paid") {
            const updated = await storage.markOrderPaid(
              order.id,
              typeof session.payment_intent === "string"  ? session.payment_intent : undefined,
            );
            if (updated) {
              const origin = `${req.protocol}://${req.get("host")}`;
              ensureShipmentsForOrder(updated, origin)
                .catch((e) => console.warn("[order/paid] auto-ship failed", e));
            }
            return res.json(updated);
          }
          if (session.status === "expired") {
            const updated = await storage.markOrderPaymentFailed(order.id, "Session expired");
            return res.json(updated);
          }
        } catch (e) {
          // fall through and return current order
        }
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    if (!sig) return res.status(400).send("Missing stripe-signature");

    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody) return res.status(400).send("Missing raw body");

    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(rawBody, sig, getWebhookSecret());
    } catch (err: any) {
      console.error("Stripe webhook signature verification failed:", err?.message);
      return res.status(400).send(`Webhook Error: ${err?.message}`);
    }
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const orderId = session.metadata?.orderId;
          if (orderId && session.payment_status === "paid") {
            const pi = typeof session.payment_intent === "string" ? session.payment_intent : undefined;
            const updated = await storage.markOrderPaid(orderId, pi);
            if (updated) {
              const origin = `${req.protocol}://${req.get("host")}`;
              ensureShipmentsForOrder(updated, origin)
                .catch((e) => console.warn("[webhook/paid] auto-ship failed", e));
            }
          }
          break;
        }
        case "checkout.session.async_payment_failed":
        case "checkout.session.expired": {
          const session = event.data.object as Stripe.Checkout.Session;
          const orderId = session.metadata?.orderId;
          if (orderId) {
            await storage.markOrderPaymentFailed(
              orderId,
              event.type === "checkout.session.expired" ? "Checkout session expired" : "Async payment failed",
            );
          }
          break;
        }
      }
      res.json({ received: true });
    } catch (err: any) {
      console.error("Stripe webhook handler error:", err?.message);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  });

  app.patch("/api/orders/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const existing = await storage.getOrder(req.params.id);
      if (!existing) return res.status(404).json({ error: "Order not found" });
      const isSellerOnOrder = existing.items.some((it) => it.farmerId === userId);
      if (!isSellerOnOrder) return res.status(403).json({ error: "Access denied" });

      const allowedStatuses: OrderStatus[] = [
        "payment_confirmed",
        "processing",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ];
      const { status, note, trackingNumber, carrier, trackingUrl } = req.body as {
        status: OrderStatus;
        note?: string;
        trackingNumber?: string;
        carrier?: string;
        trackingUrl?: string;
      };
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const tracking =
        trackingNumber !== undefined || carrier !== undefined || trackingUrl !== undefined
          ? { trackingNumber, carrier, trackingUrl }
          : undefined;

      const order = await storage.updateOrderStatus(req.params.id, status, note, tracking);
      if (!order) return res.status(404).json({ error: "Order not found" });
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  app.put("/api/orders/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const existing = await storage.getOrder(req.params.id);
      if (!existing) return res.status(404).json({ error: "Order not found" });
      if (existing.buyerId !== userId) return res.status(403).json({ error: "Access denied" });

      const cancellable = ["order_placed", "payment_confirmed", "processing"];
      if (!cancellable.includes(existing.status)) {
        return res.status(400).json({ error: "This order can no longer be cancelled" });
      }

      // For paid Stripe orders, refund FIRST. If the refund fails the order
      // stays in its current state — we never want to cancel inventory while
      // the buyer's money is still held by Stripe.
      let refundId: string | undefined;
      if (existing.paymentStatus === "paid" && existing.stripePaymentIntentId) {
        try {
          const stripe = getStripe();
          const refund = await stripe.refunds.create(
            {
              payment_intent: existing.stripePaymentIntentId,
              reason: "requested_by_customer",
              metadata: { orderId: existing.id, userId },
            },
            // Idempotency key prevents duplicate refunds if the buyer
            // double-clicks or the request is retried.
            { idempotencyKey: `refund-${existing.id}` },
          );
          refundId = refund.id;
        } catch (refundErr: any) {
          console.error("Stripe refund failed:", refundErr?.message || refundErr);
          return res.status(502).json({
            error: "Could not refund your payment. Please try again or contact support.",
          });
        }
      }

      const order = await storage.cancelOrder(req.params.id, userId);
      if (!order) return res.status(400).json({ error: "This order can no longer be cancelled" });

      if (refundId) {
        await storage.markOrderRefunded(existing.id, refundId, "Refunded via Stripe");
      }

      const final = await storage.getOrder(existing.id);
      res.json(final || order);
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel order" });
    }
  });

  // Seller orders
  app.get("/api/seller/orders", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getSellerOrders(getUserId(req)!);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch seller orders" });
    }
  });

  // Reviews
  app.get("/api/reviews/product/:productId", async (req, res) => {
    try {
      const reviews = await storage.getProductReviews(req.params.productId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const data = insertReviewSchema.parse(req.body);

      const alreadyReviewed = await storage.hasUserReviewedProduct(userId, data.productId);
      if (alreadyReviewed) {
        return res.status(409).json({ error: "You have already reviewed this product" });
      }

      // Verify the buyer actually has a delivered order for this product
      const deliveredOrder = await storage.getUserOrderForProduct(userId, data.productId);
      if (!deliveredOrder || deliveredOrder.id !== data.orderId) {
        return res.status(403).json({ error: "You can only review products from your delivered orders" });
      }

      const profile = await authStorage.getUser(userId);
      const displayName =
        profile?.name ||
        [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
        profile?.email ||
        "Anonymous";
      const avatar = profile?.avatar || profile?.profileImageUrl || "";

      const review = await storage.createReview(userId, displayName, avatar, data as InsertReview);
      res.status(201).json(review);
    } catch (error) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  app.get("/api/reviews/check/:productId", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.json({ canReview: false, hasReviewed: false });
      const hasReviewed = await storage.hasUserReviewedProduct(userId, req.params.productId);
      const deliveredOrder = await storage.getUserOrderForProduct(userId, req.params.productId);
      res.json({ canReview: !!deliveredOrder && !hasReviewed, hasReviewed, orderId: deliveredOrder?.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to check review eligibility" });
    }
  });

  // Farmer dashboard
  app.get("/api/farmers/:farmerId/stats", async (req, res) => {
    try {
      const stats = await storage.getFarmerStats(req.params.farmerId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch farmer stats" });
    }
  });

  // Local Needs (Live buyer demand feed)
  const localNeedsData: any[] = [
    { id: "need-1", productName: "Organic Tomatoes", quantity: 500, unit: "kg", priceRange: "£1.50-2.00/kg", location: "Oxford Market", latitude: 51.752, longitude: -1.2577, urgency: "high", buyerName: "The Organic Kitchen", buyerType: "restaurant", timePosted: "2 hours ago", description: "Need fresh organic tomatoes for weekly menu. Must be Grade A.", deadline: "2026-03-20", category: "vegetables" },
    { id: "need-2", productName: "Free Range Eggs", quantity: 2000, unit: "units", priceRange: "£0.25-0.35/unit", location: "Bristol Central", latitude: 51.4545, longitude: -2.5879, urgency: "high", buyerName: "Sunrise Café Chain", buyerType: "restaurant", timePosted: "5 hours ago", description: "Weekly supply needed for 8 café locations across Bristol.", deadline: "2026-03-18", category: "dairy" },
    { id: "need-3", productName: "Heritage Apples", quantity: 300, unit: "kg", priceRange: "£1.20-1.80/kg", location: "Exeter Food Hub", latitude: 50.7184, longitude: -3.5339, urgency: "medium", buyerName: "West Country Juicers", buyerType: "processor", timePosted: "1 day ago", description: "Seeking heritage apple varieties for artisan juice production.", deadline: "2026-04-01", category: "fruits" },
    { id: "need-4", productName: "Kale & Spinach Mix", quantity: 150, unit: "kg", priceRange: "£2.00-3.00/kg", location: "Cambridge", latitude: 52.2053, longitude: 0.1218, urgency: "medium", buyerName: "FreshBox Delivery", buyerType: "retailer", timePosted: "1 day ago", description: "Weekly subscription delivery box requirement.", deadline: "2026-03-22", category: "vegetables" },
    { id: "need-5", productName: "Raw Honey", quantity: 50, unit: "kg", priceRange: "£8-12/kg", location: "Norwich", latitude: 52.6309, longitude: 1.2974, urgency: "low", buyerName: "Norfolk Naturals", buyerType: "retailer", timePosted: "2 days ago", description: "Seeking local raw honey for premium gift hampers.", deadline: "2026-04-15", category: "specialty" },
    { id: "need-6", productName: "Potatoes (White)", quantity: 2000, unit: "kg", priceRange: "£0.30-0.50/kg", location: "Leeds", latitude: 53.8008, longitude: -1.5491, urgency: "high", buyerName: "Northern Schools Catering", buyerType: "school", timePosted: "3 hours ago", description: "School meals program. Annual contract possible.", deadline: "2026-03-25", category: "vegetables" },
    { id: "need-7", productName: "Fresh Herbs Bundle", quantity: 80, unit: "kg", priceRange: "£4-6/kg", location: "Manchester", latitude: 53.4808, longitude: -2.2426, urgency: "medium", buyerName: "Piccadilly Hotel", buyerType: "restaurant", timePosted: "6 hours ago", description: "Rosemary, thyme, basil, mint weekly supply needed.", deadline: "2026-03-21", category: "herbs" },
    { id: "need-8", productName: "Organic Milk", quantity: 1000, unit: "liter", priceRange: "£0.80-1.10/liter", location: "Sheffield", latitude: 53.3811, longitude: -1.4701, urgency: "high", buyerName: "City Hospital Trust", buyerType: "hospital", timePosted: "8 hours ago", description: "Hospital patient nutrition program. Certified organic required.", deadline: "2026-03-19", category: "dairy" },
    { id: "need-9", productName: "Sweet Peppers", quantity: 200, unit: "kg", priceRange: "£1.80-2.50/kg", location: "Chelmsford", latitude: 51.7356, longitude: 0.4685, urgency: "high", buyerName: "Chelmsford Food Market", buyerType: "retailer", timePosted: "1 hour ago", description: "Mixed colour peppers for weekend farmers market. Must be fresh picked.", deadline: "2026-03-20", category: "vegetables" },
    { id: "need-10", productName: "Strawberries", quantity: 100, unit: "kg", priceRange: "£3.00-4.50/kg", location: "Chelmsford", latitude: 51.7412, longitude: 0.4821, urgency: "high", buyerName: "The Baking House Chelmsford", buyerType: "restaurant", timePosted: "3 hours ago", description: "Fresh strawberries for desserts and cakes. Minimum 30g fruit size.", deadline: "2026-03-19", category: "fruits" },
    { id: "need-11", productName: "Free Range Chicken", quantity: 80, unit: "units", priceRange: "£8-12/unit", location: "Chelmsford", latitude: 51.729, longitude: 0.458, urgency: "medium", buyerName: "Springfield Hotel & Spa", buyerType: "restaurant", timePosted: "5 hours ago", description: "Whole free range chickens for hotel restaurant. Weekly recurring order.", deadline: "2026-03-22", category: "meat" },
    { id: "need-12", productName: "Salad Leaves Mix", quantity: 50, unit: "kg", priceRange: "£4-6/kg", location: "Chelmsford", latitude: 51.7443, longitude: 0.4733, urgency: "medium", buyerName: "Great Baddow Community Hub", buyerType: "school", timePosted: "2 hours ago", description: "Mixed salad for school lunch program. Rocket, spinach, watercress.", deadline: "2026-03-21", category: "vegetables" },
    { id: "need-13", productName: "Courgettes", quantity: 120, unit: "kg", priceRange: "£1.20-1.80/kg", location: "Chelmsford", latitude: 51.7320, longitude: 0.4920, urgency: "low", buyerName: "Moulsham Street Deli", buyerType: "retailer", timePosted: "4 hours ago", description: "Local courgettes for deli. Prefer mixed yellow and green varieties.", deadline: "2026-03-25", category: "vegetables" },
  ];

  app.get("/api/local-needs", (req, res) => {
    const urgency = req.query.urgency as string | undefined;
    const filtered = urgency ? localNeedsData.filter(n => n.urgency === urgency) : localNeedsData;
    res.json(filtered);
  });

  app.post("/api/local-needs", isAuthenticated, (req, res) => {
    const { productName, quantity, unit, priceRange, location, urgency, buyerType, buyerName, description, deadline } = req.body;
    if (!productName || !quantity || !location) {
      return res.status(400).json({ error: "productName, quantity and location are required" });
    }
    const UK_CITY_COORDS: Record<string, [number, number]> = {
      chelmsford: [51.7356, 0.4685], london: [51.5074, -0.1278], essex: [51.7356, 0.4685],
      oxford: [51.752, -1.2577], cambridge: [52.2053, 0.1218], bristol: [51.4545, -2.5879],
      manchester: [53.4808, -2.2426], leeds: [53.8008, -1.5491], sheffield: [53.3811, -1.4701],
      norwich: [52.6309, 1.2974], exeter: [50.7184, -3.5339], birmingham: [52.4862, -1.8904],
      liverpool: [53.4084, -2.9916], glasgow: [55.8642, -4.2518], edinburgh: [55.9533, -3.1883],
      cardiff: [51.4816, -3.1791], nottingham: [52.9548, -1.1581], leicester: [52.6369, -1.1398],
      brighton: [50.8225, -0.1372], york: [53.9600, -1.0873], bath: [51.3810, -2.3590],
      ipswich: [52.0567, 1.1482], colchester: [51.8959, 0.8919], southend: [51.5384, 0.7159],
    };
    const cityKey = location.toLowerCase().replace(/[^a-z]/g, "");
    const coords = Object.entries(UK_CITY_COORDS).find(([k]) => cityKey.includes(k));
    const [lat, lng] = coords ? coords[1] : [51.5074 + (Math.random() - 0.5) * 3, -0.5 + (Math.random() - 0.5) * 3];
    const newNeed = {
      id: `need-${Date.now()}`,
      productName, quantity: Number(quantity), unit: unit || "kg",
      priceRange: priceRange || "Negotiable",
      location,
      latitude: lat + (Math.random() - 0.5) * 0.02,
      longitude: lng + (Math.random() - 0.5) * 0.02,
      urgency: urgency || "medium",
      buyerName: buyerName || (req as any).user?.claims?.first_name || "Anonymous Buyer",
      buyerType: buyerType || "individual",
      timePosted: "Just now",
      description,
      deadline,
    };
    localNeedsData.unshift(newNeed);
    res.status(201).json(newNeed);
  });

  app.get("/api/demand-alerts", async (req, res) => {
    try {
      const location = req.query.location as string | undefined;
      const alerts = await storage.getDemandAlerts(location);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch demand alerts" });
    }
  });

  // Search
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json({ products: [], categories: [] });
      }

      const products = await storage.getProducts({ search: query });
      const categories = await storage.getCategories();
      
      const matchedCategories = categories.filter(
        (c) => 
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.subcategories.some((s) => s.name.toLowerCase().includes(query.toLowerCase()))
      );

      res.json({
        products: products.slice(0, 20),
        categories: matchedCategories,
      });
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  // AI Chat Assistant — auth-gated and rate-limited to bound OpenAI cost
  app.post("/api/chat", isAuthenticated, aiRateLimit(20, 60_000), async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }
      if (message.length > 1000) {
        return res.status(400).json({ error: "Message too long (max 1000 characters)" });
      }

      const products = await storage.getProducts({});
      const categories = await storage.getCategories();
      
      const productSummary = products.slice(0, 20).map(p => 
        `${p.name}: £${p.price}/${p.unit} from ${p.farmerName} (${p.farmerLocation})`
      ).join("\n");

      const categorySummary = categories.map(c => 
        `${c.name}: ${c.subcategories.map(s => s.name).join(", ")}`
      ).join("\n");

      const systemPrompt = `You are AgriConnect Assistant, a helpful AI for the AgriConnect agricultural marketplace platform.

AgriConnect connects farmers directly with buyers in the UK. Here's what you know:

PLATFORM FEATURES:
- Direct farmer-to-buyer marketplace
- 200+ product categories (vegetables, fruits, grains, dairy, etc.)
- Real-time map showing farmer locations
- Photo-sell feature for farmers to list products instantly
- Voice command support
- Government farming schemes information
- Multi-currency support (default: GBP £)

CURRENT PRODUCTS (sample):
${productSummary}

CATEGORIES:
${categorySummary}

GUIDELINES:
- Be friendly, helpful, and conversational
- Provide specific product recommendations when asked
- Help farmers understand how to list products
- Explain platform features clearly
- Suggest seasonal produce and farming tips
- Keep responses concise but informative
- Use £ (GBP) for prices as this is a UK platform`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map((msg: { role: string; content: string }) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user", content: message },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
      
      res.json({ reply });
    } catch (error) {
      console.error("AI Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // D.3 / D.7 Real-time translation endpoint
  app.post("/api/ai/translate", aiRateLimit(120, 60_000), async (req, res) => {
    try {
      const { text, targetLanguage = "en", context = "agricultural marketplace" } = req.body;

      if (!text || typeof text !== "string") return res.status(400).json({ error: "Text is required" });
      if (text.length > 2000) return res.status(400).json({ error: "Text too long (max 2000 characters)" });

      const lang = normalizeLang(targetLanguage);
      if (lang === "en" && targetLanguage !== "en") return res.status(400).json({ error: "Unsupported language" });

      const translated = await ai.translate(text, lang, context);
      res.json({ translated, targetLanguage: lang, original: text });
    } catch (error) {
      console.error("Translation error:", error);
      const text = typeof req.body?.text === "string" ? req.body.text : "";
      const lang = normalizeLang(req.body?.targetLanguage || "en");
      res.status(503).json({
        error: "AI translation provider is not configured or unavailable",
        code: "AI_TRANSLATION_UNAVAILABLE",
        targetLanguage: lang,
        original: text,
      });
    }
  });

  // AI Voice Command — interprets voice transcript, supports multi-turn conversation
  app.post("/api/ai/voice", aiRateLimit(15, 60_000), async (req, res) => {
    try {
      const { transcript, language = "en", context = "", conversationHistory = [] } = req.body;

      if (!transcript || typeof transcript !== "string") {
        return res.status(400).json({ error: "Transcript is required" });
      }
      if (transcript.length > 500) {
        return res.status(400).json({ error: "Transcript too long (max 500 characters)" });
      }

      const lang = normalizeLang(language);

      // Build conversation context for multi-turn
      const historySnippet = conversationHistory.length > 0
        ? "\n\nPrevious conversation:\n" + conversationHistory.map((turn: { role: string; text: string }) =>
            `${turn.role === "user" ? "User" : "Assistant"}: ${turn.text}`
          ).join("\n")
        : "";

      const parsed = await ai.interpretVoice(transcript, lang, `${context}${historySnippet}`);
      res.json(parsed);
    } catch (error) {
      console.error("Voice AI error:", error);
      res.status(503).json({
        error: "AI voice provider is not configured or unavailable",
        code: "AI_VOICE_UNAVAILABLE",
      });
    }
  });

  // AI-Powered Search — expands query with synonyms, handles typos, returns enhanced results
  app.post("/api/ai/search", aiRateLimit(30, 60_000), async (req, res) => {
    try {
      const { query, language = "en" } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }
      if (query.length > 200) {
        return res.status(400).json({ error: "Query too long (max 200 characters)" });
      }

      const lang = normalizeLang(language);
      const langName = lang === "en" ? "English" : lang === "hi" ? "Hindi" : lang === "pa" ? "Punjabi" : lang === "ta" ? "Tamil" : lang === "cy" ? "Welsh" : "Polish";

      // Step 1: Get all products for context
      const allProducts = await storage.getProducts({});
      const productNames = allProducts.map(p => p.name).slice(0, 100);

      // Step 2: Use AI to expand the search query
      const systemPrompt = `You are a search engine for an agricultural marketplace called AgriConnect.

The user searched for: "${query}" (language: ${langName})

Available product names (sample): ${productNames.join(", ")}

Your job is to:
1. Correct any typos or misspellings
2. Expand the query with synonyms and related agricultural terms (e.g. "veggies" → "vegetables", "taters" → "potatoes")
3. If the query is in a non-English language, also provide the English equivalent
4. Return a JSON object with:
   - "expandedQuery": the corrected/expanded English search terms (space-separated keywords)
   - "category": best matching category hint if obvious (one of: "daily-needs", "inputs-tools", "processed", "specialty", "other-agri", "supermarket", "dietary", "modern-farming", "services", "commercial-crops", "bio-products", or null)
   - "intent": "search" or "browse" (is the user looking for a specific product or browsing a category?)

Respond only with valid JSON, no markdown.`;

      const inferred = inferSearchExpansion(query);
      let expandedQuery = inferred.expandedQuery;
      let categoryHint: string | null = inferred.category;
      let intent: "search" | "browse" = inferred.intent;

      try {
        let raw = "";
        if (isGeminiAvailable()) {
          raw = await generateGeminiContent({
            systemInstruction: "Return only valid JSON. Do not wrap it in markdown.",
            prompt: systemPrompt,
            temperature: 0.2,
            maxOutputTokens: 150,
            responseMimeType: "application/json",
          });
        } else if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: systemPrompt }],
            max_tokens: 150,
            temperature: 0.2,
            response_format: { type: "json_object" },
          });
          raw = completion.choices[0]?.message?.content || "{}";
        }

        const aiResult = raw ? parseJsonObject(raw) : {};
        expandedQuery = aiResult.expandedQuery || query;
        categoryHint = aiResult.category || categoryHint;
        intent = aiResult.intent === "browse" ? "browse" : "search";
      } catch {
        expandedQuery = inferred.expandedQuery;
      }

      // Step 3: Search with expanded query using multiple strategies
      const keywords = expandedQuery.toLowerCase().split(/\s+/).filter(Boolean);

      // Primary: exact match on expanded terms
      let results = allProducts.filter(p => {
        const haystack = `${p.name} ${p.description} ${p.farmerName}`.toLowerCase();
        return keywords.some(kw => haystack.includes(kw));
      });

      // Fuzzy: Levenshtein-based matching for typos
      if (results.length < 3) {
        const levenshtein = (a: string, b: string): number => {
          const m = a.length, n = b.length;
          const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
          for (let i = 0; i <= m; i++) dp[i][0] = i;
          for (let j = 0; j <= n; j++) dp[0][j] = j;
          for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
              dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
              );
            }
          }
          return dp[m][n];
        };

        const fuzzyResults = allProducts.filter(p => {
          const nameLower = p.name.toLowerCase();
          return keywords.some(kw => {
            if (nameLower.includes(kw)) return true;
            // Allow up to 2 character edits for words >= 4 chars
            const words = nameLower.split(/\s+/);
            return words.some(w => w.length >= 4 && levenshtein(w, kw) <= 2);
          });
        });

        // Merge without duplicates
        const existingIds = new Set(results.map(p => p.id));
        fuzzyResults.forEach(p => { if (!existingIds.has(p.id)) results.push(p); });
      }

      // Category filter if AI suggested one
      if (categoryHint && intent === "browse") {
        const categoryMatches = results.filter(p => p.categoryId === categoryHint);
        if (categoryMatches.length > 0) results = categoryMatches;
      }

      // Sort: name match first, then rating
      results.sort((a, b) => {
        const aNameMatch = keywords.some(kw => a.name.toLowerCase().includes(kw));
        const bNameMatch = keywords.some(kw => b.name.toLowerCase().includes(kw));
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return b.rating - a.rating;
      });

      res.json({
        results: results.slice(0, 20),
        expandedQuery,
        categoryHint,
        intent,
        totalFound: results.length,
      });
    } catch (error) {
      console.error("AI Search error:", error);
      // Fallback: plain search
      try {
        const products = await storage.getProducts({ search: req.body.query });
        res.json({ results: products, expandedQuery: req.body.query, categoryHint: null, intent: "search", totalFound: products.length });
      } catch {
        res.status(500).json({ error: "Search failed" });
      }
    }
  });

  // Buyer-visible categories only
  app.get("/api/categories/buyer", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      const buyerCategories = categories
        .filter((c) => c.buyerVisible !== false)
        .map((c) => ({
          ...c,
          subcategories: c.subcategories.filter((s) => s.buyerVisible !== false),
        }));
      res.json(buyerCategories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch buyer categories" });
    }
  });

  // Government Scheme Applications
  app.get("/api/government/applications", async (req, res) => {
    try {
      const userId = getUserId(req);
      const applications = await storage.getSchemeApplications(userId);
      res.json(applications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.post("/api/government/applications", isAuthenticated, async (req, res) => {
    try {
      const parsed = schemeApplicationSchema.parse(req.body);
      const { schemeId, schemeName, farmerName, landArea, location, phone } = parsed;
      const userId = getUserId(req)!;
      const profile = await authStorage.getUser(userId);
      const displayName =
        profile?.name ||
        [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
        farmerName;
      const application = await storage.createSchemeApplication({
        userId,
        userName: displayName,
        schemeId,
        schemeName,
        farmerName,
        landArea: landArea || "",
        location: location || "",
        phone: phone || "",
        documents: [],
      });
      res.status(201).json(application);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit application" });
    }
  });

  // Share & Care live items
  // ===== Support tickets =====
  app.post("/api/support", async (req, res) => {
    try {
      if (!rateLimit(`support:${getUserId(req) ?? req.ip}`, 5, 60_000)) {
        return res.status(429).json({ error: "Too many requests, please try again shortly." });
      }
      const parsed = supportTicketSchema.parse(req.body);
      const userId = getUserId(req);
      const ticket = await storage.createSupportTicket({ ...parsed, userId });
      res.status(201).json({ id: ticket.id, status: ticket.status });
    } catch (error) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: "Failed to submit support request" });
    }
  });

  app.get("/api/support", isAuthenticated, async (req, res) => {
    try {
      const tickets = await storage.getSupportTickets(getUserId(req));
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch support tickets" });
    }
  });

  app.get("/api/share-care", (_req, res) => {
    // urgency: "urgent" (<1h), "medium" (1-3h), "safe" (3h+)
    const items = [
      { id: "sc-1",  name: "Heritage Tomatoes",      unit: "kg",     qty: 4,  donor: "Rachel Green",  location: "Chelmsford, Essex",     latitude: 51.7356, longitude: 0.4685,  emoji: "🍅", postedAgo: "2m ago",  category: "vegetables", urgency: "urgent",  expiresIn: "45 mins" },
      { id: "sc-2",  name: "Fresh Kale Bundles",     unit: "bundle", qty: 6,  donor: "Tom Hart",      location: "Norwich, Norfolk",      latitude: 52.6309, longitude: 1.2974,  emoji: "🥬", postedAgo: "8m ago",  category: "vegetables", urgency: "medium",  expiresIn: "2 hours" },
      { id: "sc-3",  name: "Duck Eggs (free-range)", unit: "dozen",  qty: 2,  donor: "Anna Bell",     location: "Bath, Somerset",        latitude: 51.3811, longitude: -2.3590, emoji: "🥚", postedAgo: "15m ago", category: "dairy",      urgency: "safe",    expiresIn: "5 hours" },
      { id: "sc-4",  name: "Organic Apples",         unit: "kg",     qty: 5,  donor: "Liam Walker",   location: "Canterbury, Kent",      latitude: 51.2802, longitude: 1.0789,  emoji: "🍎", postedAgo: "22m ago", category: "fruits",     urgency: "safe",    expiresIn: "1 day" },
      { id: "sc-5",  name: "Wild Garlic Leaves",     unit: "bunch",  qty: 8,  donor: "Sue Moore",     location: "York, Yorkshire",       latitude: 53.9590, longitude: -1.0815, emoji: "🌿", postedAgo: "35m ago", category: "medicinal",  urgency: "medium",  expiresIn: "3 hours" },
      { id: "sc-6",  name: "Surplus Courgettes",     unit: "kg",     qty: 3,  donor: "Paul Evans",    location: "Oxford, Oxfordshire",   latitude: 51.7520, longitude: -1.2577, emoji: "🥒", postedAgo: "41m ago", category: "vegetables", urgency: "medium",  expiresIn: "2 hours" },
      { id: "sc-7",  name: "Homemade Plum Jam",      unit: "jar",    qty: 10, donor: "Claire James",  location: "Exeter, Devon",         latitude: 50.7184, longitude: -3.5339, emoji: "🫙", postedAgo: "55m ago", category: "pickles",    urgency: "safe",    expiresIn: "30 days" },
      { id: "sc-8",  name: "Sunflower Seedlings",    unit: "tray",   qty: 3,  donor: "Mark Singh",    location: "Cambridge, Cambs",      latitude: 52.2053, longitude: 0.1218,  emoji: "🌻", postedAgo: "1h ago",  category: "seeds",      urgency: "safe",    expiresIn: "7 days" },
      { id: "sc-9",  name: "Raw Honey (uncapped)",   unit: "jar",    qty: 4,  donor: "Fiona Black",   location: "Bury St Edmunds, Suffolk", latitude: 52.2452, longitude: 0.7104, emoji: "🍯", postedAgo: "1h ago",  category: "honey",      urgency: "safe",    expiresIn: "60 days" },
      { id: "sc-10", name: "Mixed Salad Greens",     unit: "bag",    qty: 7,  donor: "George Ali",    location: "Lincoln, Lincolnshire", latitude: 53.2307, longitude: -0.5406, emoji: "🥗", postedAgo: "2h ago",  category: "vegetables", urgency: "urgent",  expiresIn: "50 mins" },
      { id: "sc-11", name: "Runner Beans (fresh)",   unit: "kg",     qty: 2,  donor: "Priya Shah",    location: "Colchester, Essex",     latitude: 51.8959, longitude: 0.8919,  emoji: "🫘", postedAgo: "2h ago",  category: "pulses",     urgency: "medium",  expiresIn: "2 hours" },
      { id: "sc-12", name: "Butternut Squash",       unit: "each",   qty: 5,  donor: "David Owen",    location: "Kings Lynn, Norfolk",   latitude: 52.7510, longitude: 0.3924,  emoji: "🎃", postedAgo: "3h ago",  category: "vegetables", urgency: "safe",    expiresIn: "5 days" },
      { id: "sc-13", name: "Sourdough Loaves",       unit: "loaf",   qty: 6,  donor: "Holt Bakery",   location: "Brighton, East Sussex", latitude: 50.8225, longitude: -0.1372, emoji: "🍞", postedAgo: "20m ago", category: "bakery",     urgency: "urgent",  expiresIn: "40 mins" },
      { id: "sc-14", name: "Beef Mince (frozen)",    unit: "kg",     qty: 4,  donor: "Hartley Farm",  location: "Reading, Berkshire",    latitude: 51.4543, longitude: -0.9781, emoji: "🥩", postedAgo: "30m ago", category: "meat",       urgency: "safe",    expiresIn: "30 days" },
      { id: "sc-15", name: "Surplus Yoghurt Pots",   unit: "pack",   qty: 12, donor: "Dales Dairy",   location: "Manchester",            latitude: 53.4808, longitude: -2.2426, emoji: "🥣", postedAgo: "1h ago",  category: "dairy",      urgency: "medium",  expiresIn: "1.5 hours" },
    ];
    res.json(items);
  });

  // Land Listings (extended types)
  app.get("/api/land-listings", async (req, res) => {
    try {
      const { type } = req.query;
      if (type === "sale") {
        const listings = await storage.getLandSaleListings();
        res.json(listings);
      } else if (type === "investment") {
        const listings = await storage.getLandInvestmentListings();
        res.json(listings);
      } else if (type === "community") {
        const listings = await storage.getCommunityPlotListings();
        res.json(listings);
      } else {
        const [sale, investment, community] = await Promise.all([
          storage.getLandSaleListings(),
          storage.getLandInvestmentListings(),
          storage.getCommunityPlotListings(),
        ]);
        res.json({ sale, investment, community });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch land listings" });
    }
  });

  // ── Server-side web proxy ──────────────────────────────────────────────────
  // Fetches any URL from the server side (no X-Frame-Options / CSP restrictions
  // from the target host apply here), strips framing-blocker headers, injects
  // a <base> tag so relative resources resolve correctly, and rewrites internal
  // links so further navigation stays inside the proxy tunnel.
  app.get("/api/proxy", async (req, res) => {
    const raw = req.query.url as string;
    if (!raw) return res.status(400).send("Missing ?url= parameter");

    let targetUrl: string;
    try {
      targetUrl = raw.startsWith("http") ? raw : "https://" + raw;
      new URL(targetUrl); // validate
    } catch {
      return res.status(400).send("Invalid URL");
    }

    try {
      const upstream = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
          "Accept-Encoding": "identity",
        },
        redirect: "follow",
      });

      const contentType = upstream.headers.get("content-type") || "text/html";

      // Forward safe headers, drop the framing blockers
      const SKIP = new Set([
        "x-frame-options",
        "content-security-policy",
        "content-security-policy-report-only",
        "x-content-type-options",
        "strict-transport-security",
        "transfer-encoding",
        "content-encoding",
        "connection",
      ]);
      upstream.headers.forEach((val, key) => {
        if (!SKIP.has(key.toLowerCase())) res.setHeader(key, val);
      });
      // Ensure the browser never blocks our re-served page
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");

      if (contentType.includes("text/html")) {
        let html = await upstream.text();
        const origin = new URL(targetUrl).origin;

        // 1. Inject or replace <base> so relative URLs resolve to original host
        if (/<base\s/i.test(html)) {
          html = html.replace(/<base[^>]*>/i, `<base href="${origin}/">`);
        } else {
          html = html.replace(/(<head[^>]*>)/i, `$1<base href="${origin}/">`);
          if (!html.includes("<base")) {
            html = `<base href="${origin}/">` + html;
          }
        }

        // 2. Inject nav-rewriter script so internal links stay in the proxy
        const navScript = `
<script>
(function(){
  var PROXY = '/api/proxy?url=';
  function rewrite(href){
    if(!href) return href;
    // Already a proxy URL — leave it
    if(href.indexOf('/api/proxy') === 0) return href;
    // Fragment-only or JS — leave it
    if(href.startsWith('#') || href.startsWith('javascript:')) return href;
    return PROXY + encodeURIComponent(href);
  }
  // Intercept link clicks
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if(a && a.href && a.href.startsWith('http')){
      e.preventDefault();
      window.location.href = rewrite(a.href);
    }
  }, true);
  // Intercept form submissions
  document.addEventListener('submit', function(e){
    var f = e.target;
    if(f && f.action && f.action.startsWith('http')){
      e.preventDefault();
      f.action = rewrite(f.action);
      f.submit();
    }
  }, true);
})();
</script>`;
        html = html.replace(/<\/body>/i, navScript + "</body>");
        if (!html.includes("</body>")) html += navScript;

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
      } else {
        // Non-HTML assets: stream through as-is
        const buf = await upstream.arrayBuffer();
        res.setHeader("Content-Type", contentType);
        res.send(Buffer.from(buf));
      }
    } catch (err: any) {
      res.status(502).send(
        `<html><body style="font-family:sans-serif;padding:40px;color:#333">
          <h2>Could not reach this site</h2>
          <p>${err.message}</p>
          <p><a href="${targetUrl}" target="_blank">Try opening it in a new tab instead</a></p>
        </body></html>`
      );
    }
  });

  // ============================================================
  // Shipping (Phase 1) — quotes, booking, tracking
  // ============================================================

  // Cart → shipping handoff. Buyer is at checkout step 2: we group their
  // current cart by farmer and return one quote-set per farmer using each
  // farmer's stored lat/lng for the pickup leg.
  app.post("/api/cart/shipping-quotes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const { drop } = cartShippingQuotesRequestSchema.parse(req.body);
      const cart = await storage.getCart(userId);
      if (!cart || cart.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      // Per-farmer grouping. Each cart item carries a denormalised Product
      // that already has farmerLatitude/Longitude/Location, so we don't need
      // to refetch the farmer profile here.
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
        // Estimate weight per unit by category — products don't carry a
        // shipping weight field today. These defaults are conservative
        // (≥0.3kg) so quotes don't underprice fragile small parcels.
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

      // Total cheapest-bundle hint for the UI
      const totalCheapest = result.reduce((s, g) => s + (g.quotes[0]?.price ?? 0), 0);
      res.json({ groups: result, totalCheapest, currency: "GBP" });
    } catch (err) {
      if (handleZod(err, res)) return;
      console.error("[cart/shipping-quotes] error", err);
      res.status(500).json({ error: "Failed to calculate cart shipping quotes" });
    }
  });

  app.post("/api/shipping/quotes", async (req, res) => {
    try {
      const input = quoteShipmentSchema.parse(req.body);
      const result = calculateQuotes(input);
      res.json(result);
    } catch (err) {
      if (handleZod(err, res)) return;
      res.status(500).json({ error: "Failed to calculate quotes" });
    }
  });

  app.post("/api/shipping/book", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const data = bookShipmentSchema.parse(req.body);
      const card = rateCardById(data.quoteId.replace(/^q_/, "").split("_")[0]);
      // Recompute server-side to prevent price tampering
      const recomputed = calculateQuotes({
        pickup: data.pickup, drop: data.drop, items: data.items,
        service: data.service, pickupWindow: data.pickupWindow,
      });
      const partnerId = card?.partnerId ?? recomputed.quotes[0]?.partnerId;
      const chosen = recomputed.quotes.find((q) => q.partnerId === partnerId) ?? recomputed.quotes[0];
      if (!chosen) return res.status(400).json({ error: "No quote available for this route" });

      // Coords for pricing/persistence come from the canonical server-side
      // geocoder; client-supplied lat/lng are ignored to prevent price tampering.
      const pickupCoords = geocodePostcode({ postcode: data.pickup.postcode, country: data.pickup.country });
      const dropCoords = geocodePostcode({ postcode: data.drop.postcode, country: data.drop.country });

      const eta = new Date(Date.now() + chosen.etaHours * 3600_000).toISOString();

      const ship = await storage.createShipment({
        orderId: data.orderId,
        senderId: userId,
        receiverId: undefined,
        partnerId: chosen.partnerId,
        partnerName: chosen.partnerName,
        service: chosen.service,
        pickup: { ...data.pickup, ...pickupCoords },
        drop: { ...data.drop, ...dropCoords },
        items: data.items,
        distanceKm: recomputed.distanceKm,
        weightKg: recomputed.weightKg,
        price: chosen.price,
        currency: chosen.currency,
        eta,
        notes: data.notes,
        notifyEmail: data.notifyEmail ?? data.drop.email,
        notifyWhatsapp: data.notifyWhatsapp,
      });

      // Hand off to the carrier adapter (Royal Mail / DPD / mock).
      // Failures here MUST NOT roll back the shipment — the AGS-tracking
      // ID and our tracking page still work even if the partner API blips.
      let bookedShip = ship;
      try {
        const adapter = getAdapter(chosen.partnerId);
        const carrierRef = await adapter.bookShipment(ship);
        const updated = await storage.setShipmentCarrierRef(ship.id, {
          externalId: carrierRef.externalId,
          externalTrackingNumber: carrierRef.externalTrackingNumber,
          externalTrackingUrl: carrierRef.externalTrackingUrl,
          labelUrl: carrierRef.labelUrl,
          adapterName: carrierRef.adapterName,
        });
        if (updated) bookedShip = updated;
        await storage.addShipmentEvent({
          shipmentId: ship.id,
          status: ship.status,
          location: `${ship.pickup.city}, ${ship.pickup.country}`,
          note: `Label generated · ${chosen.partnerName}${carrierRef.externalTrackingNumber ? ` · ${carrierRef.externalTrackingNumber}` : ""}${carrierRef.live ? "" : " (simulated)"}`,
          source: "partner_api",
        });
      } catch (adapterErr) {
        console.warn("[ship/book] adapter failed", (adapterErr as Error).message);
      }

      // Fire-and-forget notification
      const origin = `${req.protocol}://${req.get("host")}`;
      const trackUrl = `${origin}/ship/track/${bookedShip.trackingId}`;
      const email = bookedShip.notifyEmail;
      if (email || bookedShip.notifyWhatsapp) {
        const { subject, body, shortBody } = buildShipmentBookedEmail(bookedShip, trackUrl);
        notify({ to: { email, whatsapp: bookedShip.notifyWhatsapp }, subject, body, shortBody, shipment: bookedShip })
          .catch((e) => console.warn("[ship/book] notify failed", e));
      }

      res.status(201).json({ shipment: bookedShip, trackUrl });
    } catch (err) {
      if (handleZod(err, res)) return;
      console.error("[ship/book] error", err);
      res.status(500).json({ error: "Failed to book shipment" });
    }
  });

  app.get("/api/shipments/me", isAuthenticated, async (req, res) => {
    const userId = getUserId(req)!;
    const list = await storage.listUserShipments(userId);
    res.json(list);
  });

  app.get("/api/shipments/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req)!;
    const ship = await storage.getShipment(req.params.id);
    if (!ship) return res.status(404).json({ error: "Shipment not found" });
    if (ship.senderId !== userId && ship.receiverId !== userId) {
      return res.status(403).json({ error: "Not authorised" });
    }
    const events = await storage.listShipmentEvents(ship.id);
    res.json({ shipment: ship, events });
  });

  // Public tracking — no auth (only safe-to-share fields)
  app.get("/api/shipping/track/:trackingId", async (req, res) => {
    const ship = await storage.getShipmentByTrackingId(req.params.trackingId);
    if (!ship) return res.status(404).json({ error: "Tracking ID not found" });
    const events = await storage.listShipmentEvents(ship.id);
    const safe = {
      trackingId: ship.trackingId,
      status: ship.status,
      partnerName: ship.partnerName,
      service: ship.service,
      pickup: { city: ship.pickup.city, postcode: ship.pickup.postcode, country: ship.pickup.country },
      drop: { city: ship.drop.city, postcode: ship.drop.postcode, country: ship.drop.country },
      itemsSummary: `${ship.items.reduce((s, i) => s + i.quantity, 0)} item(s) · ${ship.weightKg.toFixed(1)} kg`,
      distanceKm: ship.distanceKm,
      eta: ship.eta,
      createdAt: ship.createdAt,
      updatedAt: ship.updatedAt,
      events: events.map((e) => ({
        ts: e.ts, status: e.status, location: e.location, note: e.note, source: e.source,
      })),
    };
    res.json(safe);
  });

  // Demo helper to advance shipment status (any logged-in sender — Phase 2 will gate to partners)
  app.post("/api/shipments/:id/advance", isAuthenticated, async (req, res) => {
    const userId = getUserId(req)!;
    const ship = await storage.getShipment(req.params.id);
    if (!ship) return res.status(404).json({ error: "Not found" });
    if (ship.senderId !== userId) return res.status(403).json({ error: "Not authorised" });
    const order: typeof ship.status[] = ["booked", "assigned", "picked_up", "in_transit", "out_for_delivery", "delivered"];
    const idx = order.indexOf(ship.status);
    const next = idx < 0 || idx >= order.length - 1 ? "delivered" : order[idx + 1];
    const updated = await storage.updateShipmentStatus(ship.id, next, "Status updated", `${ship.drop.city}`);
    res.json(updated);
  });

  return httpServer;
}
