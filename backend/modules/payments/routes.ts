import { createHash, randomUUID } from "crypto";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { storage } from "../../storage";
import { checkoutRepository } from "../../repositories/checkout-repository";
import { paymentRepository } from "../../repositories/payment-repository";
import { eligibilityService } from "../../payments/eligibility-service";
import { paymentRuntimeConfig } from "../../payments/config";
import { paymentService } from "../../payments/payment-service";
import { logPaymentFailure } from "../../payments/security";
import { pricingService } from "../../payments/pricing-service";
import { reconciliationService } from "../../payments/reconciliation-service";
import { paymentOperationsRepository } from "../../repositories/payment-operations-repository";
import { paymentStateService } from "../../payments/payment-state-service";
import { providerRegistry } from "../../payments/provider-registry";
import type { Order, OrderItem } from "@shared/schema";
import type { ShipServiceType } from "@shared/schema";
import { queueOrderConfirmation } from "../../notifications";
import { getExchangeRateSnapshot } from "../../currency/exchange-rate-service";
import {
  calculateQuotesFromCoords,
  geocodePostcode,
  resolveCheckoutFulfillmentQuote,
  resolveSellerPickupCoordinates,
} from "../../shipping/quote-engine";
import {
  verifyCheckoutTurnstile,
  type TurnstileVerification,
} from "../../security/turnstile";

interface PaymentRouteDeps {
  getUserId(req: Request): string | undefined;
}

const quoteSchema = z.object({
  currency: z.enum(["GBP", "INR"]).optional(),
  deliveryMethod: z.enum(["standard", "express", "pickup"]).default("standard"),
  sellerIds: z.array(z.string().min(1)).min(1).max(100),
  shippingChoices: z.record(
    z.string(),
    z.object({ partnerId: z.string().min(1), service: z.string().min(1) }),
  ),
  deliveryAddressStruct: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional(),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    county: z.string().optional(),
    postcode: z.string().min(1),
    country: z.string().length(2),
  }),
});

const intentSchema = z.object({
  quoteId: z.string().uuid(),
  captchaToken: z.string().min(1).max(2048),
  provider: z.enum(["stripe", "paypal", "razorpay", "mock"]),
  simulatedMethod: z.enum(["card", "razorpay", "paypal"]).optional(),
  deliveryAddress: z.string().min(3).max(500).optional(),
  scenario: z.enum(["success", "failure", "cancelled", "requires_action", "pending", "timeout"]).optional(),
}).superRefine((input, context) => {
  if (input.simulatedMethod && input.provider !== "mock") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["simulatedMethod"],
      message: "Simulated payment labels are available only with the mock provider",
    });
  }
});
const cashOrderSchema = z.object({
  quoteId: z.string().uuid(),
  captchaToken: z.string().min(1).max(2048),
});
const clientConfirmationSchema = z.object({
  providerPaymentId: z.string().min(1).max(255),
  providerSessionId: z.string().min(1).max(255),
  signature: z.string().min(1).max(1024),
});

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const orderNumber = () => `AGC${new Date().getFullYear().toString().slice(-2)}-${Math.floor(100000 + Math.random() * 900000)}`;

function respondToUnexpectedCheckoutFailure(
  res: Response,
  error: unknown,
  operation: "cash checkout failed" | "checkout intent failed",
  stage: string,
): Response {
  const message = error instanceof Error ? error.message : "";
  if (/Idempotency|stock|Product/.test(message)) {
    return res.status(409).json({ error: message });
  }

  logPaymentFailure(operation, error, { stage });
  const providerFailure = stage === "create_provider_checkout";
  return res.status(503).json({
    error: providerFailure
      ? "The selected payment provider is temporarily unavailable. Please try again."
      : "Checkout is temporarily unavailable. Please try again.",
    code: providerFailure
      ? "payment_provider_unavailable"
      : "checkout_service_unavailable",
  });
}

function respondToCaptchaFailure(
  verification: Exclude<TurnstileVerification, { success: true }>,
  res: Response,
): Response {
  const unavailable = verification.code !== "captcha_invalid";
  return res.status(unavailable ? 503 : 400).json({
    error: unavailable
      ? "Security verification is temporarily unavailable"
      : "Complete the security verification again",
    code: verification.code,
  });
}
const cartFingerprint = (cart: Awaited<ReturnType<typeof storage.getCart>>) =>
  hash(
    cart.map((item) => [
      item.productId,
      item.quantity,
      item.unitPrice ?? item.product.price,
      item.product.stock,
    ]),
  );

function checkoutDescription(
  orderNumber: string,
  items: OrderItem[],
): string {
  const visibleItems = items
    .slice(0, 3)
    .map((item) => `${item.quantity}x ${item.productName}`);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);
  const suffix = hiddenCount > 0 ? `, +${hiddenCount} more` : "";
  return `Order ${orderNumber}: ${visibleItems.join(", ")}${suffix}`.slice(0, 255);
}

type QuoteData = {
  deliveryMethod?: Order["deliveryMethod"];
  shippingChoices?: Order["shippingChoices"];
  deliveryAddressStruct?: Order["deliveryAddressStruct"];
  deliveryAddress?: string;
  sellerIds?: string[];
  itemCount?: number;
  items?: Array<{
    productId: string;
    name: string;
    image?: string;
    quantity: number;
    unitPrice: number;
    farmerId: string;
    farmerName: string;
  }>;
};

function selectQuotedCart(
  cart: Awaited<ReturnType<typeof storage.getCart>>,
  data: QuoteData,
) {
  const sellerIds = new Set(data.sellerIds ?? []);
  return cart.filter((item) => sellerIds.has(item.product.farmerId));
}

function serializeQuote(quote: Awaited<ReturnType<typeof paymentRepository.getQuote>>) {
  if (!quote) return undefined;
  const data = quote.quoteData as QuoteData;
  return {
    id: quote.id,
    currency: quote.currency,
    subtotalMinor: quote.subtotalMinor.toString(),
    taxMinor: quote.taxMinor.toString(),
    shippingMinor: quote.shippingMinor.toString(),
    platformFeeMinor: quote.platformFeeMinor.toString(),
    totalMinor: quote.totalMinor.toString(),
    expiresAt: quote.expiresAt,
    items: data.items ?? [],
    deliveryAddress: data.deliveryAddress,
    deliveryAddressStruct: data.deliveryAddressStruct,
    deliveryMethod: data.deliveryMethod ?? "standard",
    shippingChoices: data.shippingChoices ?? {},
  };
}

async function cashEligibility(quote: NonNullable<Awaited<ReturnType<typeof paymentRepository.getQuote>>>) {
  const data = quote.quoteData as QuoteData;
  const sellerIds = data.sellerIds ?? [];
  if (paymentRuntimeConfig.mvpModeEnabled) {
    return {
      available: sellerIds.length > 0,
      reasonCode: sellerIds.length > 0 ? undefined : "cart_empty",
    };
  }
  const { marketplaceSellerVerified } = await import("../../seller-verification/capabilities");
  const verified = await Promise.all(sellerIds.map((sellerId) => marketplaceSellerVerified(sellerId)));
  if (verified.some((value) => !value)) {
    return { available: false, reasonCode: "seller_marketplace_verification_required" };
  }
  if (paymentRuntimeConfig.mode !== "live") {
    return {
      available: sellerIds.length > 0,
      reasonCode: sellerIds.length > 0 ? undefined : "cart_empty",
    };
  }
  const choices = data.shippingChoices ?? {};
  const preferences = await paymentOperationsRepository.getSellerCashPreferences(sellerIds);
  const preferenceBySeller = new Map(preferences.map((preference) => [preference.sellerId, preference]));
  for (const sellerId of sellerIds) {
    const choice = choices[sellerId];
    const preference = preferenceBySeller.get(sellerId);
    if (!choice) return { available: false, reasonCode: "fulfillment_selection_required" };
    if (choice.partnerId === "buyer-collection") {
      if (!preference?.acceptsCashAtPickup) {
        return { available: false, reasonCode: "seller_cash_pickup_unavailable" };
      }
      continue;
    }
    if (choice.partnerId === "farmer-delivery") {
      if (!preference?.acceptsCashOnFarmerDelivery) {
        return { available: false, reasonCode: "seller_cash_delivery_unavailable" };
      }
      continue;
    }
    return { available: false, reasonCode: "carrier_requires_prepayment" };
  }
  return {
    available: sellerIds.length > 0,
    reasonCode: sellerIds.length > 0 ? undefined : "cart_empty",
  };
}

export function registerPaymentRoutes(app: Express, deps: PaymentRouteDeps): void {
  app.get("/api/payments/methods", isAuthenticated, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      const quoteId = z.string().uuid().parse(req.query.quoteId);
      const quote = await paymentRepository.getQuote(quoteId);
      if (!quote || quote.buyerId !== userId) {
        return res.status(404).json({ error: "Checkout quote not found" });
      }
      if (quote.expiresAt <= new Date()) {
        return res.status(409).json({ error: "Checkout quote expired", code: "quote_required" });
      }
      const usage = await checkoutRepository.getQuoteUsage(quote.id);
      if (usage) {
        return res.status(409).json({
          error: "This checkout quote has already been used",
          code: "quote_consumed",
          orderId: usage.orderId,
          attemptId: usage.attemptId,
        });
      }
      const data = quote.quoteData as QuoteData;
      const sellerIds = data.sellerIds ?? [];
      const simulatedCard = paymentRuntimeConfig.mode === "mock";
      const currency = quote.currency as "GBP" | "INR";
      const stripe = await eligibilityService.evaluate(
        simulatedCard ? "mock" : "stripe",
        currency,
        sellerIds,
        sellerIds.length,
      );
      const razorpay = simulatedCard
        ? stripe
        : await eligibilityService.evaluate(
            "razorpay",
            currency,
            sellerIds,
            sellerIds.length,
          );
      const paypal = simulatedCard
        ? stripe
        : await eligibilityService.evaluate(
            "paypal",
            currency,
            sellerIds,
            sellerIds.length,
          );
      const cash =
        paymentRuntimeConfig.mvpModeEnabled || currency === "GBP"
          ? await cashEligibility(quote)
          : { available: false, reasonCode: "cash_gbp_only" };
      return res.json({
        currency,
        mode: paymentRuntimeConfig.mode,
        methods: [
          {
            id: "stripe",
            available: stripe.eligible,
            reasonCode: stripe.eligible ? undefined : stripe.reasons[0] ?? "stripe_unavailable",
            displayStatus: stripe.eligible ? "available" : "unavailable",
            flow: simulatedCard ? "mock" : "redirect",
          },
          {
            id: "cash",
            available: cash.available,
            reasonCode: cash.reasonCode,
            displayStatus: cash.available ? "available" : "unavailable",
            flow: "manual",
          },
          {
            id: "razorpay",
            available: razorpay.eligible,
            reasonCode: razorpay.eligible
              ? undefined
              : razorpay.reasons[0] ?? "razorpay_unavailable",
            displayStatus: razorpay.eligible ? "available" : "unavailable",
            flow: simulatedCard ? "mock" : "client_sdk",
          },
          {
            id: "paypal",
            available: paypal.eligible,
            reasonCode: paypal.eligible
              ? undefined
              : paypal.reasons[0] ?? "paypal_unavailable",
            displayStatus: paypal.eligible ? "available" : "unavailable",
            flow: simulatedCard ? "mock" : "redirect",
          },
        ],
      });
    } catch {
      return res.status(400).json({ error: "A valid checkout quote is required" });
    }
  });

  app.post("/api/checkout/quotes", isAuthenticated, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      const input = quoteSchema.parse(req.body);
      const cart = await storage.getCart(userId);
      if (!cart.length) return res.status(400).json({ error: "Cart is empty" });
      const requestedSellerIds = Array.from(new Set(input.sellerIds));
      const requestedSellerIdSet = new Set(requestedSellerIds);
      const selectedCart = cart.filter((item) =>
        requestedSellerIdSet.has(item.product.farmerId),
      );
      const selectedCartSellerIds = new Set(
        selectedCart.map((item) => item.product.farmerId),
      );
      if (
        selectedCart.length === 0 ||
        requestedSellerIds.some((sellerId) => !selectedCartSellerIds.has(sellerId))
      ) {
        return res.status(400).json({ error: "Select at least one farmer from your cart" });
      }
      const selectedShippingChoices = Object.fromEntries(
        requestedSellerIds.flatMap((sellerId) => {
          const choice = input.shippingChoices[sellerId];
          return choice ? [[sellerId, choice] as const] : [];
        }),
      );
      const missingChoiceSellerIds = requestedSellerIds.filter(
        (sellerId) => !selectedShippingChoices[sellerId],
      );
      if (missingChoiceSellerIds.length > 0) {
        return res.status(400).json({
          error: "Shipping selection is required for each selected farmer",
          code: "selected_fulfilment_required",
          sellerIds: missingChoiceSellerIds,
        });
      }
      if (selectedCart.some((item) => (item.product.currency ?? "GBP") !== "GBP")) {
        return res.status(400).json({ error: "Online checkout currently supports GBP products only" });
      }
      const currency = input.currency ?? paymentRuntimeConfig.defaultCurrency;
      const availability = await storage.validateCart(selectedCart.map((item) => ({ productId: item.productId, quantity: item.quantity })));
      if (!availability.ok) return res.status(409).json({ error: "Cart availability changed", issues: availability.issues });
      if (selectedCart.some((item) => item.product.farmerId === userId)) {
        return res.status(400).json({ error: "You cannot order your own product" });
      }
      const rawSubtotal = selectedCart.reduce(
        (sum, item) =>
          sum + (item.unitPrice ?? item.product.price) * item.quantity,
        0,
      );
      let shippingMinor: bigint;
      if (input.shippingChoices && input.deliveryAddressStruct) {
        const drop = geocodePostcode({
          postcode: input.deliveryAddressStruct.postcode,
          country: input.deliveryAddressStruct.country,
        });
        const bySeller = new Map<string, typeof selectedCart>();
        for (const item of selectedCart) {
          const group = bySeller.get(item.product.farmerId) ?? [];
          group.push(item);
          bySeller.set(item.product.farmerId, group);
        }
        let shippingPence = 0;
        for (const [sellerId, sellerItems] of Array.from(bySeller.entries())) {
          const choice = selectedShippingChoices[sellerId];
          if (!choice) {
            return res.status(400).json({
              error: "Shipping selection is required for each selected farmer",
              code: "selected_fulfilment_required",
            });
          }
          const firstProduct = sellerItems[0].product;
          const pickup = resolveSellerPickupCoordinates({
            lat: firstProduct.farmerLatitude,
            lng: firstProduct.farmerLongitude,
            location: firstProduct.farmerLocation,
            country: "GB",
          });
          const quotes = calculateQuotesFromCoords({
            pickup,
            drop: { lat: drop.lat, lng: drop.lng, country: input.deliveryAddressStruct.country },
            service: choice.service as ShipServiceType,
            items: sellerItems.map((item) => ({
              name: item.product.name,
              quantity: item.quantity,
              weightKg: /grain|flour|feed|hay/.test(item.product.categoryId.toLowerCase()) ? 1 : 0.5,
              coldChain: /dairy|meat|seafood|frozen/.test(item.product.categoryId.toLowerCase()),
              fragile: /egg|berry|tomato/.test(item.product.name.toLowerCase()),
            })),
          });
          const selected = resolveCheckoutFulfillmentQuote(quotes.quotes, {
            partnerId: choice.partnerId,
            service: choice.service as ShipServiceType,
          });
          if (!selected) return res.status(409).json({ error: "Selected shipping option is no longer available" });
          shippingPence += Math.round(selected.price * 100);
        }
        shippingMinor = BigInt(shippingPence);
      } else {
        shippingMinor =
          input.deliveryMethod === "express"
            ? BigInt(599)
            : input.deliveryMethod === "pickup" || rawSubtotal >= 30
              ? BigInt(0)
              : BigInt(499);
      }
      const basePricing = pricingService.quote(
        selectedCart,
        "GBP",
        shippingMinor,
        paymentRuntimeConfig.platformFeeBps,
      );
      let pricing = basePricing;
      if (currency === "INR") {
        const snapshot = await getExchangeRateSnapshot();
        const inrRate = snapshot.rates.INR;
        if (!Number.isFinite(inrRate) || inrRate <= 0) {
          return res.status(503).json({
            error: "INR checkout is temporarily unavailable because the exchange rate could not be verified",
          });
        }
        const convertMinor = (amountMinor: string) =>
          BigInt(Math.round(Number(amountMinor) * inrRate));
        const subtotalMinor = convertMinor(basePricing.subtotal.amountMinor);
        const taxMinor = convertMinor(basePricing.tax.amountMinor);
        const shippingInrMinor = convertMinor(basePricing.shipping.amountMinor);
        const platformFeeMinor = convertMinor(basePricing.platformFee.amountMinor);
        const totalMinor =
          subtotalMinor + taxMinor + shippingInrMinor + platformFeeMinor;
        const money = (amountMinor: bigint) => ({
          currency: "INR" as const,
          amountMinor: amountMinor.toString(),
        });
        pricing = {
          subtotal: money(subtotalMinor),
          tax: money(taxMinor),
          shipping: money(shippingInrMinor),
          platformFee: money(platformFeeMinor),
          total: money(totalMinor),
        };
      }
      const sellerIds = requestedSellerIds;
      const fingerprint = cartFingerprint(selectedCart);
      const expiresAt = new Date(Date.now() + paymentRuntimeConfig.quoteTtlMinutes * 60_000);
      const deliveryAddress = input.deliveryAddressStruct
        ? [
            input.deliveryAddressStruct.name,
            input.deliveryAddressStruct.line1,
            input.deliveryAddressStruct.line2,
            input.deliveryAddressStruct.city,
            input.deliveryAddressStruct.county,
            input.deliveryAddressStruct.postcode,
            input.deliveryAddressStruct.country,
          ].filter(Boolean).join(", ")
        : undefined;
      const quote = await paymentRepository.createQuote({
        buyerId: userId,
        currency,
        subtotalMinor: BigInt(pricing.subtotal.amountMinor),
        taxMinor: BigInt(pricing.tax.amountMinor),
        shippingMinor: BigInt(pricing.shipping.amountMinor),
        platformFeeMinor: BigInt(pricing.platformFee.amountMinor),
        totalMinor: BigInt(pricing.total.amountMinor),
        cartFingerprint: fingerprint,
        quoteData: {
          deliveryMethod: input.deliveryMethod,
          sellerIds,
          itemCount: selectedCart.length,
          shippingChoices: selectedShippingChoices,
          deliveryAddressStruct: input.deliveryAddressStruct,
          deliveryAddress,
          items: selectedCart.map((item) => ({
            productId: item.productId,
            name: item.product.name,
            image: item.product.images?.[0],
            quantity: item.quantity,
            unitPrice: item.unitPrice ?? item.product.price,
            farmerId: item.product.farmerId,
            farmerName: item.product.farmerName,
          })),
        },
        expiresAt,
      });
      res.status(201).json({
        ...serializeQuote(quote),
        pricing,
        sellerCount: sellerIds.length,
      });
    } catch (error) {
      res.status(400).json({ error: "Unable to create checkout quote" });
    }
  });

  app.get("/api/checkout/quotes/:quoteId", isAuthenticated, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      const quoteId = z.string().uuid().parse(req.params.quoteId);
      const quote = await paymentRepository.getQuote(quoteId);
      if (!quote || quote.buyerId !== userId) {
        return res.status(404).json({ error: "Checkout quote not found" });
      }
      if (quote.expiresAt <= new Date()) {
        return res.status(409).json({ error: "Checkout quote expired", code: "quote_required" });
      }
      const usage = await checkoutRepository.getQuoteUsage(quote.id);
      if (usage) {
        return res.status(409).json({
          error: "This checkout quote has already been used",
          code: "quote_consumed",
          orderId: usage.orderId,
          attemptId: usage.attemptId,
        });
      }
      return res.json(serializeQuote(quote));
    } catch {
      return res.status(400).json({ error: "A valid checkout quote is required" });
    }
  });

  app.post("/api/checkout/cash-orders", isAuthenticated, async (req, res) => {
    let stage = "validate_request";
    try {
      const userId = deps.getUserId(req)!;
      const idempotencyKey = req.get("Idempotency-Key")?.trim();
      if (!idempotencyKey || idempotencyKey.length > 160) {
        return res.status(400).json({ error: "A valid Idempotency-Key header is required" });
      }
      const parsedInput = cashOrderSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({
          error: "A valid cash checkout request is required",
          code: "invalid_checkout_request",
        });
      }
      const input = parsedInput.data;
      stage = "lookup_cash_idempotency";
      const existingCashOrder = await checkoutRepository.getCashOrderByIdempotency(
        userId,
        idempotencyKey,
      );
      if (existingCashOrder) {
        if (existingCashOrder.quoteId !== input.quoteId) {
          return res.status(409).json({
            error: "Idempotency key was already used for another checkout",
          });
        }
        if (existingCashOrder.orderId) {
          return res.json({ orderId: existingCashOrder.orderId, replayed: true });
        }
        return res.status(409).json({ error: "Cash checkout is still being created" });
      }
      stage = "load_quote";
      const quote = await paymentRepository.getQuote(input.quoteId);
      if (!quote || quote.buyerId !== userId) {
        return res.status(404).json({ error: "Checkout quote not found" });
      }
      if (quote.expiresAt <= new Date()) {
        return res.status(409).json({ error: "Checkout quote expired", code: "quote_required" });
      }
      stage = "load_quote_usage";
      const usedQuote = await checkoutRepository.getQuoteUsage(quote.id);
      if (usedQuote) {
        return res.status(409).json({
          error: "This checkout quote has already been used",
          code: "quote_consumed",
          orderId: usedQuote.orderId,
          attemptId: usedQuote.attemptId,
        });
      }
      if (!paymentRuntimeConfig.mvpModeEnabled && quote.currency !== "GBP") {
        return res.status(409).json({ error: "Cash checkout is available for GBP orders only" });
      }
      const data = quote.quoteData as QuoteData;
      stage = "load_cart";
      const cart = await storage.getCart(userId);
      const selectedCart = selectQuotedCart(cart, data);
      if (!selectedCart.length || cartFingerprint(selectedCart) !== quote.cartFingerprint) {
        return res.status(409).json({ error: "Cart changed", code: "quote_required" });
      }
      if (selectedCart.some((item) => item.product.farmerId === userId)) {
        return res.status(400).json({ error: "You cannot order your own product" });
      }
      stage = "evaluate_cash_eligibility";
      const eligibility = await cashEligibility(quote);
      if (!eligibility.available) {
        return res.status(409).json({
          error: "Cash payment is unavailable for this checkout",
          reasonCode: eligibility.reasonCode,
        });
      }
      if (!data.deliveryAddress || !data.deliveryAddressStruct || !data.shippingChoices) {
        return res.status(409).json({ error: "Checkout quote is incomplete", code: "quote_required" });
      }
      stage = "load_buyer";
      const user = await authStorage.getUser(userId);
      const now = new Date();
      const order: Order = {
        id: randomUUID(),
        orderNumber: orderNumber(),
        buyerId: userId,
        buyerName: user?.name || user?.email || "Buyer",
        buyerEmail: user?.email ?? undefined,
        items: selectedCart.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          productImage: item.product.images?.[0],
          quantity: item.quantity,
          price: item.unitPrice ?? item.product.price,
          farmerId: item.product.farmerId,
          farmerName: item.product.farmerName,
        })),
        status: "order_placed",
        statusHistory: [{
          status: "order_placed",
          timestamp: now.toISOString(),
          note: "Cash payment due at handover",
        }],
        subtotal: Number(quote.subtotalMinor) / 100,
        tax: 0,
        deliveryFee: 0,
        shippingTotal: Number(quote.shippingMinor) / 100 || undefined,
        total: Number(quote.totalMinor) / 100,
        deliveryAddress: data.deliveryAddress,
        deliveryMethod: data.deliveryMethod ?? "standard",
        paymentMethod: "cod",
        paymentStatus: "manual",
        shippingChoices: data.shippingChoices,
        deliveryAddressStruct: data.deliveryAddressStruct,
        createdAt: now.toISOString(),
      };
      stage = "verify_captcha";
      const captcha = await verifyCheckoutTurnstile(input.captchaToken, req.ip);
      if (!captcha.success) return respondToCaptchaFailure(captcha, res);
      stage = "create_cash_order";
      const result = await checkoutRepository.createCashOrder({
        order,
        quoteId: quote.id,
        currency: quote.currency as "GBP" | "INR",
        idempotencyKey,
        reservationExpiresAt: now,
      });
      stage = "load_created_order";
      const persisted = await storage.getOrder(result.orderId);
      if (!persisted) throw new Error("Cash order was not persisted");
      if (!result.replayed) {
        queueOrderConfirmation(persisted, `${req.protocol}://${req.get("host")}`);
      }
      return res.status(result.replayed ? 200 : 201).json({
        orderId: persisted.id,
        replayed: result.replayed,
      });
    } catch (error) {
      return respondToUnexpectedCheckoutFailure(
        res,
        error,
        "cash checkout failed",
        stage,
      );
    }
  });

  app.post("/api/checkout/intents", isAuthenticated, async (req, res) => {
    let stage = "validate_request";
    try {
      const userId = deps.getUserId(req)!;
      const idempotencyKey = req.get("Idempotency-Key")?.trim();
      if (!idempotencyKey || idempotencyKey.length > 160) {
        return res.status(400).json({ error: "A valid Idempotency-Key header is required" });
      }
      const parsedInput = intentSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({
          error: "A valid checkout intent request is required",
          code: "invalid_checkout_request",
        });
      }
      const input = parsedInput.data;
      const idempotencyReference = `${userId}:${idempotencyKey}`;
      stage = "lookup_payment_idempotency";
      const existingAttempt = await paymentRepository.getAttemptByIdempotency(input.provider, idempotencyReference);
      if (existingAttempt) {
        return res.status(200).json({
          orderId: existingAttempt.orderId,
          attemptId: existingAttempt.id,
          nextAction: { type: "wait", attemptId: existingAttempt.id },
          idempotentReplay: true,
        });
      }
      stage = "load_quote";
      const quote = await paymentRepository.getQuote(input.quoteId);
      if (!quote || quote.buyerId !== userId) return res.status(404).json({ error: "Checkout quote not found" });
      if (quote.expiresAt <= new Date()) return res.status(409).json({ error: "Checkout quote expired", code: "quote_required" });
      stage = "load_quote_usage";
      const usedQuote = await checkoutRepository.getQuoteUsage(quote.id);
      if (usedQuote) {
        return res.status(409).json({
          error: "This checkout quote has already been used",
          code: "quote_consumed",
          orderId: usedQuote.orderId,
          attemptId: usedQuote.attemptId,
        });
      }
      const quoteData = quote.quoteData as QuoteData;
      stage = "load_cart";
      const cart = await storage.getCart(userId);
      const selectedCart = selectQuotedCart(cart, quoteData);
      const fingerprint = cartFingerprint(selectedCart);
      if (!selectedCart.length) return res.status(409).json({ error: "Cart changed", code: "quote_required" });
      if (fingerprint !== quote.cartFingerprint) return res.status(409).json({ error: "Cart changed", code: "quote_required" });
      const sellerIds = quoteData.sellerIds ?? [];
      stage = "evaluate_payment_eligibility";
      const eligibility = await eligibilityService.evaluate(input.provider, quote.currency as "GBP" | "INR", sellerIds, sellerIds.length);
      if (!eligibility.eligible) return res.status(409).json({ error: "Payment method unavailable", reasons: eligibility.reasons });
      stage = "load_buyer";
      const user = await authStorage.getUser(userId);
      const now = new Date();
      const deliveryAddress = quoteData.deliveryAddress ?? input.deliveryAddress;
      if (!deliveryAddress) {
        return res.status(409).json({ error: "Checkout quote is incomplete", code: "quote_required" });
      }
      const items: OrderItem[] = selectedCart.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images?.[0],
        quantity: item.quantity,
        price: item.unitPrice ?? item.product.price,
        farmerId: item.product.farmerId,
        farmerName: item.product.farmerName,
      }));
      const order: Order = {
        id: randomUUID(),
        orderNumber: orderNumber(),
        buyerId: userId,
        buyerName: user?.name || user?.email || "Buyer",
        buyerEmail: user?.email ?? undefined,
        items,
        status: "order_placed",
        statusHistory: [{ status: "order_placed", timestamp: now.toISOString(), note: "Awaiting verified payment" }],
        subtotal: Number(quote.subtotalMinor) / 100,
        tax: Number(quote.taxMinor) / 100,
        deliveryFee: 0,
        shippingTotal: Number(quote.shippingMinor) / 100 || undefined,
        total: Number(quote.totalMinor) / 100,
        deliveryAddress,
        deliveryMethod: quoteData.deliveryMethod ?? "standard",
        paymentMethod:
          input.provider === "mock"
            ? input.simulatedMethod ?? "card"
            : input.provider,
        paymentStatus: "pending",
        shippingChoices: quoteData.shippingChoices,
        deliveryAddressStruct: quoteData.deliveryAddressStruct,
        createdAt: now.toISOString(),
      };
      stage = "verify_captcha";
      const captcha = await verifyCheckoutTurnstile(input.captchaToken, req.ip);
      if (!captcha.success) return respondToCaptchaFailure(captcha, res);
      stage = "create_checkout_records";
      const records = await checkoutRepository.create({
        order,
        quoteId: quote.id,
        provider: input.provider,
        amountMinor: quote.totalMinor.toString(),
        currency: quote.currency as "GBP" | "INR",
        idempotencyReference,
        requestFingerprint: hash({
          provider: input.provider,
          simulatedMethod: input.simulatedMethod,
          scenario: input.scenario,
          quoteId: quote.id,
        }),
        expiresAt: new Date(Date.now() + paymentRuntimeConfig.reservationTtlMinutes * 60_000),
      });
      stage = "load_seller_payment_accounts";
      const sellerAccounts =
        input.provider === "mock" || paymentRuntimeConfig.mvpModeEnabled
          ? []
          : await paymentOperationsRepository.getSellerPaymentAccounts(input.provider, sellerIds);
      const accountBySeller = new Map(
        sellerAccounts.map((account) => [account.sellerId, account.providerAccountId]),
      );
      const sellerSubtotals = sellerIds.map((sellerId) => ({
        sellerId,
        subtotalMinor: BigInt(
          Math.round(
            selectedCart
              .filter((item) => item.product.farmerId === sellerId)
              .reduce(
                (sum, item) =>
                  sum + (item.unitPrice ?? item.product.price) * item.quantity,
                0,
              ) * 100,
          ),
        ),
      }));
      const subtotalTotal = sellerSubtotals.reduce(
        (total, allocation) => total + allocation.subtotalMinor,
        BigInt(0),
      );
      let allocatedTotal = BigInt(0);
      let allocatedFee = BigInt(0);
      const allocations = sellerSubtotals.map((allocation, index) => {
        const last = index === sellerSubtotals.length - 1;
        const amountMinor = last
          ? quote.totalMinor - allocatedTotal
          : (quote.totalMinor * allocation.subtotalMinor) / subtotalTotal;
        const platformFeeMinor = last
          ? quote.platformFeeMinor - allocatedFee
          : (quote.platformFeeMinor * allocation.subtotalMinor) / subtotalTotal;
        allocatedTotal += amountMinor;
        allocatedFee += platformFeeMinor;
        return {
          sellerId: allocation.sellerId,
          providerAccountId: accountBySeller.get(allocation.sellerId) ?? "",
          amount: {
            currency: quote.currency as "GBP" | "INR",
            amountMinor: amountMinor.toString(),
          },
          platformFeeMinor: platformFeeMinor.toString(),
        };
      });
      const returnBaseUrl = (
        paymentRuntimeConfig.returnBaseUrl ?? `${req.protocol}://${req.get("host")}`
      ).replace(/\/$/, "");
      let result;
      try {
        stage = "create_provider_checkout";
        result = await paymentService.executeProviderCall(input.provider, {
          attemptId: records.attemptId,
          orderId: order.id,
          idempotencyReference,
          amount: { currency: quote.currency as "GBP" | "INR", amountMinor: quote.totalMinor.toString() },
          sellerIds,
          allocationCount: sellerIds.length,
          allocations,
          returnBaseUrl,
          cancelUrl:
            input.provider === "stripe"
              ? `${returnBaseUrl}/api/payments/returns/stripe/cancel?attemptId=${encodeURIComponent(records.attemptId)}`
              : undefined,
          customerEmail: user?.email ?? undefined,
          checkoutDescription: checkoutDescription(order.orderNumber, items),
          scenario: input.scenario,
        }, `http:${process.pid}`);
      } catch (error) {
        const failedAttempt = await paymentRepository.getAttempt(records.attemptId);
        if (
          failedAttempt?.providerCallStatus === "failed" &&
          failedAttempt.paymentStatus === "failed"
        ) {
          const persistedOrder = await storage.getOrder(order.id);
          if (persistedOrder) {
            await storage.restoreStockForOrder(persistedOrder);
            await storage.updateOrderStatus(
              order.id,
              "cancelled",
              "Payment provider could not create the payment",
            );
          }
        }
        throw error;
      }
      res.status(201).json({ orderId: order.id, attemptId: records.attemptId, nextAction: result.nextAction });
    } catch (error) {
      return respondToUnexpectedCheckoutFailure(
        res,
        error,
        "checkout intent failed",
        stage,
      );
    }
  });

  app.get(
    "/api/payments/returns/stripe/cancel",
    isAuthenticated,
    async (req, res) => {
      const returnBase = (
        paymentRuntimeConfig.returnBaseUrl ?? `${req.protocol}://${req.get("host")}`
      ).replace(/\/$/, "");
      const attemptId = z.string().uuid().safeParse(req.query.attemptId);
      if (!attemptId.success) return res.redirect(`${returnBase}/checkout`);
      const userId = deps.getUserId(req)!;
      const attempt = await paymentRepository.getAttempt(attemptId.data);
      const order = attempt ? await storage.getOrder(attempt.orderId) : undefined;
      const quoteId = attempt
        ? await checkoutRepository.getQuoteIdForAttempt(attempt.id)
        : undefined;
      if (
        !attempt ||
        !order ||
        order.buyerId !== userId ||
        attempt.provider !== "stripe" ||
        !attempt.providerSessionId ||
        !quoteId
      ) {
        return res.redirect(`${returnBase}/checkout`);
      }
      try {
        const adapter = providerRegistry.get("stripe");
        const cancelled = await adapter.cancelCheckout?.(attempt.providerSessionId);
        if (!cancelled) {
          return res.redirect(
            `${returnBase}/payment/${encodeURIComponent(attempt.id)}/processing`,
          );
        }
        const cancelledAttempt =
          await paymentRepository.cancelExpiredProviderAttempt(attempt.id);
        if (cancelledAttempt) {
          await storage.restoreStockForOrder(order);
          await storage.updateOrderStatus(
            order.id,
            "cancelled",
            "Stripe Checkout was closed by the buyer",
          );
        }
        return res.redirect(
          `${returnBase}/checkout/payment/${encodeURIComponent(quoteId)}`,
        );
      } catch {
        await paymentRepository.markReconciliationPending(attempt.id);
        return res.redirect(
          `${returnBase}/payment/${encodeURIComponent(attempt.id)}/processing`,
        );
      }
    },
  );

  app.get("/api/payments/attempts/:attemptId", isAuthenticated, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      let attempt = await paymentRepository.getAttempt(req.params.attemptId);
      if (!attempt) return res.status(404).json({ error: "Payment attempt not found" });
      const order = await storage.getOrder(attempt.orderId);
      if (!order || order.buyerId !== userId) return res.status(404).json({ error: "Payment attempt not found" });
      if (!["succeeded", "failed", "cancelled", "refunded"].includes(attempt.paymentStatus)) {
        const attemptId = attempt.id;
        try {
          await reconciliationService.reconcileAttempt(attemptId);
          const refreshedAttempt = await paymentRepository.getAttempt(attemptId);
          if (refreshedAttempt) attempt = refreshedAttempt;
        } catch (error) {
          // A provider or reconciliation outage must not terminate the API
          // process or turn an unknown payment into a failed payment. Return
          // the last server-authoritative state and let the polling client retry.
          console.error("[payments] reconciliation deferred", {
            attemptId,
            errorCode: error instanceof Error ? error.name : "unknown_error",
          });
        }
      }
      return res.json({ attempt, order: await storage.getOrder(order.id) });
    } catch (error) {
      console.error("[payments] status lookup failed", {
        attemptId: req.params.attemptId,
        errorCode: error instanceof Error ? error.name : "unknown_error",
      });
      return res.status(500).json({ error: "Payment status is temporarily unavailable" });
    }
  });

  app.post("/api/payments/attempts/:attemptId/cancel", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    const attempt = await paymentRepository.getAttempt(req.params.attemptId);
    const order = attempt ? await storage.getOrder(attempt.orderId) : undefined;
    if (!attempt || !order || order.buyerId !== userId) return res.status(404).json({ error: "Payment attempt not found" });
    const cancelled = await paymentRepository.cancelAttempt(attempt.id);
    if (!cancelled) {
      await reconciliationService.reconcileAttempt(attempt.id);
      const current = await paymentRepository.getAttempt(attempt.id);
      if (!current || !["failed", "cancelled"].includes(current.paymentStatus)) {
        return res.status(409).json({
          error: "Provider cancellation is not yet verified. Payment status is still being checked.",
        });
      }
    }
    await storage.restoreStockForOrder(order);
    await storage.updateOrderStatus(order.id, "cancelled", "Payment cancelled by buyer");
    res.json(cancelled);
  });

  app.post("/api/payments/attempts/:attemptId/retry", isAuthenticated, async (_req, res) => {
    res.status(409).json({ error: "A fresh quote is required before retrying", code: "quote_required" });
  });

  app.post(
    "/api/payments/attempts/:attemptId/client-confirmation",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = deps.getUserId(req)!;
        const confirmation = clientConfirmationSchema.parse(req.body);
        let attempt = await paymentRepository.getAttempt(req.params.attemptId);
        const order = attempt ? await storage.getOrder(attempt.orderId) : undefined;
        if (!attempt || !order || order.buyerId !== userId) {
          return res.status(404).json({ error: "Payment attempt not found" });
        }
        if (
          attempt.providerSessionId !== confirmation.providerSessionId ||
          attempt.provider !== "razorpay"
        ) {
          return res.status(409).json({ error: "Payment confirmation does not match the attempt" });
        }
        const adapter = providerRegistry.get("razorpay");
        if (!adapter.verifyClientConfirmation) {
          return res.status(503).json({ error: "Provider confirmation is unavailable" });
        }
        const payment = await adapter.verifyClientConfirmation(confirmation);
        attempt =
          (await paymentRepository.replaceProviderPaymentReference(
            attempt.id,
            payment.providerPaymentId,
          )) ?? attempt;
        await paymentStateService.applyVerifiedPayment(attempt, payment);
        return res.json({ attemptId: attempt.id, paymentStatus: payment.status });
      } catch (error) {
        return res.status(400).json({
          error: "Payment confirmation failed",
        });
      }
    },
  );

  app.get("/api/payments/returns/:provider", async (req, res) => {
    const provider = z.enum(["paypal"]).safeParse(req.params.provider);
    const attemptId = z.string().uuid().safeParse(req.query.attemptId);
    const token = z.string().min(1).safeParse(req.query.token);
    const returnBase = paymentRuntimeConfig.returnBaseUrl ?? `${req.protocol}://${req.get("host")}`;
    if (!provider.success || !attemptId.success || !token.success) {
      return res.redirect(`${returnBase}/payment/failed?reason=invalid_provider_return`);
    }
    const attempt = await paymentRepository.getAttempt(attemptId.data);
    if (
      !attempt ||
      attempt.provider !== provider.data ||
      attempt.providerSessionId !== token.data
    ) {
      return res.redirect(`${returnBase}/payment/failed?reason=provider_return_mismatch`);
    }
    try {
      const adapter = providerRegistry.get(provider.data);
      if (!adapter.completeCheckout) throw new Error("Provider return is not supported");
      const payment = await adapter.completeCheckout(
        token.data,
        attempt.idempotencyReference,
      );
      await paymentStateService.applyVerifiedPayment(attempt, payment);
      return res.redirect(
        `${returnBase}/payment/${encodeURIComponent(attempt.id)}/processing`,
      );
    } catch {
      await paymentRepository.markReconciliationPending(attempt.id);
      return res.redirect(
        `${returnBase}/payment/${encodeURIComponent(attempt.id)}/processing`,
      );
    }
  });
}
