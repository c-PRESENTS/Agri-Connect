import type { Express, Request, Response } from "express";
import type Stripe from "stripe";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import type { BasicOrderStatus, Order, OrderItem, OrderStatus, Shipment } from "@shared/schema";
import { bookShipmentSchema, createOrderSchema, quoteShipmentSchema } from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { buildShipmentBookedEmail, notify, queueOrderConfirmation } from "../../notifications";
import { getStripe, getWebhookSecret } from "../../payments/stripe";
import { capturePayPalOrder, createPayPalOrder, getPayPalCapture, refundPayPalCapture, verifyPayPalWebhook } from "../../payments/paypal";
import { createRazorpayOrder, getRazorpayPayment, refundRazorpayPayment, verifyRazorpayPayment, verifyRazorpayWebhook } from "../../payments/razorpay";
import { getAdapter } from "../../shipping/adapters";
import { calculateQuotes, calculateQuotesFromCoords, geocodePostcode, rateCardById, resolveSellerPickupCoordinates } from "../../shipping/quote-engine";
import { storage } from "../../storage";
import { audit } from "../../audit";

interface CommerceRouteDeps {
  getUserId(req: Request): string | undefined;
}

const DAY_16_STATUS_TRANSITIONS: Record<BasicOrderStatus, BasicOrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: ["refunded"],
  refunded: [],
};

function toSellerOrderView(order: Order, sellerId: string): Order {
  const items = order.items.filter((item) => item.farmerId === sellerId);
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  return {
    ...order,
    items,
    subtotal,
    total: subtotal,
    tax: 0,
    deliveryFee: 0,
    shippingTotal: undefined,
    buyerEmail: undefined,
    shippingChoices: undefined,
    deliveryAddressStruct: undefined,
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

    const pickup = resolveSellerPickupCoordinates({
      lat: firstProduct.farmerLatitude,
      lng: firstProduct.farmerLongitude,
      location: firstProduct.farmerLocation,
      country: "GB",
    });
    const recomputed = calculateQuotesFromCoords({
      pickup,
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
          line1: pickup.estimated ? "UK regional pickup" : firstProduct.farmerLocation || "Farm",
          city: pickup.estimated ? "Regional pickup" : firstProduct.farmerLocation || "Farm",
          postcode: "FA RM",
          country: "GB",
          lat: pickup.lat,
          lng: pickup.lng,
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

async function calculateAuthoritativeShipping(
  items: OrderItem[],
  shippingChoices: NonNullable<Order["shippingChoices"]>,
  drop: NonNullable<Order["deliveryAddressStruct"]>,
): Promise<number> {
  const dropLL = geocodePostcode({ postcode: drop.postcode, country: drop.country });
  const itemsByFarmer = new Map<string, OrderItem[]>();
  for (const item of items) {
    if (!itemsByFarmer.has(item.farmerId)) itemsByFarmer.set(item.farmerId, []);
    itemsByFarmer.get(item.farmerId)!.push(item);
  }
  let total = 0;
  for (const [farmerId, farmerItems] of Array.from(itemsByFarmer.entries())) {
    const choice = shippingChoices[farmerId];
    if (!choice) throw new Error(`Shipping selection required for seller ${farmerId}`);
    const products = await Promise.all(farmerItems.map((item) => storage.getProduct(item.productId)));
    const firstProduct = products.find(Boolean);
    if (!firstProduct) throw new Error("Product is no longer available");
    const shipItems = farmerItems.map((item, index) => {
      const category = (products[index]?.categoryId || "").toLowerCase();
      return {
        name: item.productName,
        quantity: item.quantity,
        weightKg: /grain|flour|feed|hay/.test(category) ? 1 : 0.5,
        coldChain: /dairy|meat|seafood|frozen/.test(category),
        fragile: /egg|berry|tomato/.test(item.productName.toLowerCase()),
      };
    });
    const quotes = calculateQuotesFromCoords({
      pickup: resolveSellerPickupCoordinates({ lat: firstProduct.farmerLatitude, lng: firstProduct.farmerLongitude, location: firstProduct.farmerLocation, country: "GB" }),
      drop: { lat: dropLL.lat, lng: dropLL.lng, country: drop.country },
      items: shipItems,
      service: choice.service,
    }).quotes;
    const selected = quotes.find((quote) => quote.partnerId === choice.partnerId && quote.service === choice.service);
    if (!selected) throw new Error("Selected shipping option is no longer available");
    total += selected.price;
  }
  return parseFloat(total.toFixed(2));
}

async function confirmVerifiedPayment(order: Order, provider: "stripe" | "paypal" | "razorpay", reference: string, origin: string): Promise<Order | undefined> {
  const wasAlreadyPaid = order.paymentStatus === "paid";
  const updated = await storage.markOrderPaid(order.id, provider === "stripe" ? reference : undefined);
  if (!updated) return undefined;
  if (provider === "stripe") await storage.setOrderPaymentReference(updated.id, provider, reference);
  else await storage.setOrderPaymentTransactionId(updated.id, reference);
  const finalOrder = await storage.getOrder(updated.id) ?? updated;
  if (wasAlreadyPaid) return finalOrder;
  queueOrderConfirmation(finalOrder, origin);
  ensureShipmentsForOrder(finalOrder, origin).catch((error) => console.warn(`[${provider}/paid] auto-ship failed`, error));
  audit({ action: `payment.${provider}_verified`, actorId: finalOrder.buyerId, targetType: "order", targetId: finalOrder.id });
  return finalOrder;
}

export function registerCommerceRoutes(app: Express, deps: CommerceRouteDeps): void {
  const { getUserId } = deps;
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
      if (order.buyerId === userId) return res.json(order);
      if (!order.items.some((item) => item.farmerId === userId)) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(toSellerOrderView(order, userId));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const parsed = createOrderSchema.parse(req.body);
      const availability = await storage.validateCart(
        parsed.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      );
      if (!availability.ok) {
        return res.status(400).json({
          error: "One or more products are unavailable",
          issues: availability.issues,
        });
      }
      const canonicalItems: OrderItem[] = [];
      for (const item of parsed.items) {
        const product = await storage.getProduct(item.productId);
        if (!product) return res.status(400).json({ error: `Product no longer available: ${item.productName}` });
        if (product?.farmerId === userId) {
          return res.status(400).json({ error: "You cannot order your own product" });
        }
        canonicalItems.push({
          ...item,
          productName: product.name,
          productImage: product.images?.[0],
          price: product.price,
          farmerId: product.farmerId,
          farmerName: product.farmerName,
        });
      }
      const onlinePayment = parsed.paymentMethod === "stripe" || parsed.paymentMethod === "paypal" || parsed.paymentMethod === "razorpay";
      if (onlinePayment && (!parsed.shippingChoices || !parsed.deliveryAddressStruct || Object.keys(parsed.shippingChoices).length === 0)) {
        return res.status(400).json({ error: "Shipping selection required. Please choose carriers on the Shipping step." });
      }
      const shippingTotal = parsed.shippingChoices && parsed.deliveryAddressStruct
        ? await calculateAuthoritativeShipping(canonicalItems, parsed.shippingChoices, parsed.deliveryAddressStruct)
        : undefined;
      const order = await storage.createOrder(
        userId,
        canonicalItems,
        parsed.deliveryAddress,
        parsed.paymentMethod,
        parsed.deliveryMethod,
        {
          shippingChoices: parsed.shippingChoices,
          deliveryAddressStruct: parsed.deliveryAddressStruct,
          shippingTotal,
        },
      );
      await storage.clearCart(userId);
      if (order.paymentStatus === "manual") queueOrderConfirmation(order, resolveStripeOrigin(req));
      audit({ action: "order.created", actorId: userId, targetType: "order", targetId: order.id });
      res.status(201).json(order);
    } catch (error) {
      if (handleZod(error, res)) return;
      if (error instanceof Error && /Product not found|Insufficient stock/.test(error.message)) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.post("/api/paypal/orders/:orderId", isAuthenticated, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order || order.buyerId !== getUserId(req)!) return res.status(404).json({ error: "Order not found" });
      if (order.paymentMethod !== "paypal" || order.paymentStatus !== "pending") return res.status(400).json({ error: "Order is not awaiting PayPal payment" });
      const paypalOrder = await createPayPalOrder(order.id, order.total);
      await storage.setOrderPaymentReference(order.id, "paypal", paypalOrder.id);
      res.status(201).json({ id: paypalOrder.id, clientId: process.env.PAYPAL_CLIENT_ID || "" });
    } catch (error) {
      await storage.markOrderPaymentFailed(req.params.orderId, "PayPal checkout could not be created");
      res.status(502).json({ error: "Could not create PayPal payment" });
    }
  });

  app.post("/api/paypal/orders/:paypalOrderId/capture", isAuthenticated, async (req, res) => {
    try {
      const order = await storage.getOrderByPaymentReference("paypal", req.params.paypalOrderId);
      if (!order || order.buyerId !== getUserId(req)!) return res.status(404).json({ error: "Order not found" });
      const captured = await capturePayPalOrder(req.params.paypalOrderId, order.id);
      const capture = getPayPalCapture(captured);
      if (captured.status !== "COMPLETED" || capture?.status !== "COMPLETED") return res.status(409).json({ error: "PayPal payment is not captured" });
      const updated = await confirmVerifiedPayment(order, "paypal", capture.id, resolveStripeOrigin(req));
      res.json(updated);
    } catch {
      res.status(502).json({ error: "Could not verify PayPal payment" });
    }
  });

  app.post("/api/paypal/webhook", async (req, res) => {
    try {
      const headers = Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
      if (!await verifyPayPalWebhook(headers, req.body)) return res.status(400).send("Invalid PayPal webhook");
      const event = req.body as { event_type?: string; resource?: { id?: string; supplementary_data?: { related_ids?: { order_id?: string } } } };
      if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
        const paymentId = event.resource?.id;
        const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id;
        if (paymentId && paypalOrderId) {
          const order = await storage.getOrderByPaymentReference("paypal", paypalOrderId);
          if (order) await confirmVerifiedPayment(order, "paypal", paymentId, resolveStripeOrigin(req));
        }
      } else if (event.event_type === "PAYMENT.CAPTURE.DENIED" || event.event_type === "PAYMENT.CAPTURE.DECLINED") {
        const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id;
        if (paypalOrderId) {
          const order = await storage.getOrderByPaymentReference("paypal", paypalOrderId);
          if (order) await storage.markOrderPaymentFailed(order.id, "PayPal payment was declined");
        }
      }
      res.json({ received: true });
    } catch { res.status(500).json({ error: "PayPal webhook failed" }); }
  });

  app.post("/api/razorpay/orders/:orderId", isAuthenticated, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order || order.buyerId !== getUserId(req)!) return res.status(404).json({ error: "Order not found" });
      if (order.paymentMethod !== "razorpay" || order.paymentStatus !== "pending") return res.status(400).json({ error: "Order is not awaiting Razorpay payment" });
      const razorpayOrder = await createRazorpayOrder(order.id, order.total);
      await storage.setOrderPaymentReference(order.id, "razorpay", razorpayOrder.id);
      res.status(201).json({ id: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency, keyId: process.env.RAZORPAY_KEY_ID || "" });
    } catch {
      await storage.markOrderPaymentFailed(req.params.orderId, "Razorpay checkout could not be created");
      res.status(502).json({ error: "Could not create Razorpay payment" });
    }
  });

  app.post("/api/razorpay/verify", isAuthenticated, async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as Record<string, string>;
      const order = await storage.getOrderByPaymentReference("razorpay", razorpay_order_id);
      if (!order || order.buyerId !== getUserId(req)!) return res.status(404).json({ error: "Order not found" });
      if (!verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature)) return res.status(400).json({ error: "Invalid payment signature" });
      const payment = await getRazorpayPayment(razorpay_payment_id);
      if (payment.order_id !== razorpay_order_id || payment.status !== "captured" || payment.amount !== Math.round(order.total * 100)) return res.status(409).json({ error: "Razorpay payment is not captured" });
      res.json(await confirmVerifiedPayment(order, "razorpay", payment.id, resolveStripeOrigin(req)));
    } catch { res.status(502).json({ error: "Could not verify Razorpay payment" }); }
  });

  app.post("/api/razorpay/webhook", async (req, res) => {
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody || !verifyRazorpayWebhook(rawBody, req.headers["x-razorpay-signature"] as string | undefined)) return res.status(400).send("Invalid Razorpay webhook");
    try {
      const event = req.body as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } } };
      const payment = event.payload?.payment?.entity;
      if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.status === "captured" && payment.order_id && payment.id) {
        const order = await storage.getOrderByPaymentReference("razorpay", payment.order_id);
        if (order) await confirmVerifiedPayment(order, "razorpay", payment.id, resolveStripeOrigin(req));
      } else if (event.event === "payment.failed" && payment?.order_id) {
        const order = await storage.getOrderByPaymentReference("razorpay", payment.order_id);
        if (order) await storage.markOrderPaymentFailed(order.id, "Razorpay payment failed");
      }
      res.json({ received: true });
    } catch { res.status(500).json({ error: "Razorpay webhook failed" }); }
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
          const pickup = resolveSellerPickupCoordinates({
            lat: firstProd.farmerLatitude,
            lng: firstProd.farmerLongitude,
            location: firstProd.farmerLocation,
            country: "GB",
          });
          const recomputed = calculateQuotesFromCoords({
            pickup,
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
            const updated = await confirmVerifiedPayment(
              order,
              "stripe",
              typeof session.payment_intent === "string" ? session.payment_intent : session.id,
              resolveStripeOrigin(req),
            );
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
            const order = await storage.getOrder(orderId);
            if (order) await confirmVerifiedPayment(order, "stripe", pi || session.id, resolveStripeOrigin(req));
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
      const ownsEveryItem = existing.items.every((it) => it.farmerId === userId);
      if (!isSellerOnOrder || !ownsEveryItem) {
        return res.status(403).json({ error: "Only the seller for this order can update its status" });
      }
      const { status, note, trackingNumber, carrier, trackingUrl } = req.body as {
        status: OrderStatus;
        note?: string;
        trackingNumber?: string;
        carrier?: string;
        trackingUrl?: string;
      };
      if (!status || !(status in DAY_16_STATUS_TRANSITIONS)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const nextStatus = status as BasicOrderStatus;
      const allowedNext = DAY_16_STATUS_TRANSITIONS[existing.status as BasicOrderStatus];
      if (!allowedNext || !allowedNext.includes(nextStatus)) {
        return res.status(400).json({ error: "Invalid status transition" });
      }

      const tracking =
        trackingNumber !== undefined || carrier !== undefined || trackingUrl !== undefined
          ? { trackingNumber, carrier, trackingUrl }
          : undefined;

      const order = await storage.updateOrderStatus(req.params.id, nextStatus, note, tracking);
      if (!order) return res.status(404).json({ error: "Order not found" });
      audit({ action: "order.status_changed", actorId: userId, targetType: "order", targetId: order.id });
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

      const cancellable = ["pending", "confirmed", "processing", "order_placed", "payment_confirmed"];
      if (!cancellable.includes(existing.status)) {
        return res.status(400).json({ error: "This order can no longer be cancelled" });
      }

      // For paid Stripe orders, refund FIRST. If the refund fails the order
      // stays in its current state — we never want to cancel inventory while
      // the buyer's money is still held by Stripe.
      let refundId: string | undefined;
      if (existing.paymentStatus === "paid") {
        try {
          if (existing.paymentProvider === "stripe" && existing.stripePaymentIntentId) {
            const stripe = getStripe();
            const refund = await stripe.refunds.create(
              { payment_intent: existing.stripePaymentIntentId, reason: "requested_by_customer", metadata: { orderId: existing.id, userId } },
              { idempotencyKey: `refund-${existing.id}` },
            );
            refundId = refund.id;
          } else if (existing.paymentProvider === "paypal" && existing.paymentTransactionId) {
            refundId = await refundPayPalCapture(existing.paymentTransactionId, existing.id);
          } else if (existing.paymentProvider === "razorpay" && existing.paymentTransactionId) {
            refundId = await refundRazorpayPayment(existing.paymentTransactionId);
          } else {
            return res.status(409).json({ error: "The payment reference is unavailable; contact support to cancel this order." });
          }
        } catch (refundErr: any) {
          console.error("Payment refund failed:", refundErr?.message || refundErr);
          return res.status(502).json({
            error: "Could not refund your payment. Please try again or contact support.",
          });
        }
      }

      const order = await storage.cancelOrder(req.params.id, userId);
      if (!order) return res.status(400).json({ error: "This order can no longer be cancelled" });

      if (refundId) {
        await storage.markOrderRefunded(existing.id, refundId, `Refunded via ${existing.paymentProvider}`);
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
      const sellerId = getUserId(req)!;
      const orders = await storage.getSellerOrders(sellerId);
      res.json(orders.map((order) => toSellerOrderView(order, sellerId)));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch seller orders" });
    }
  });

  // ============================================================
  // Shipping (Phase 1) — quotes, booking, tracking
  // ============================================================

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
}
