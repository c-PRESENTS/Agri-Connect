import { createHash, randomUUID } from "crypto";
import type { Express, Request } from "express";
import { z } from "zod";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { storage } from "../../storage";
import { checkoutRepository } from "../../repositories/checkout-repository";
import { paymentRepository } from "../../repositories/payment-repository";
import { eligibilityService } from "../../payments/eligibility-service";
import { paymentRuntimeConfig, paymentCurrencySchema } from "../../payments/config";
import { paymentService } from "../../payments/payment-service";
import { pricingService } from "../../payments/pricing-service";
import { reconciliationService } from "../../payments/reconciliation-service";
import { paymentOperationsRepository } from "../../repositories/payment-operations-repository";
import { paymentStateService } from "../../payments/payment-state-service";
import { providerRegistry } from "../../payments/provider-registry";
import type { Order, OrderItem } from "@shared/schema";
import type { ShipServiceType } from "@shared/schema";
import { calculateQuotesFromCoords, geocodePostcode, resolveSellerPickupCoordinates } from "../../shipping/quote-engine";

interface PaymentRouteDeps {
  getUserId(req: Request): string | undefined;
}

const quoteSchema = z.object({
  currency: paymentCurrencySchema.default("GBP"),
  deliveryMethod: z.enum(["standard", "express", "pickup"]).default("standard"),
  shippingChoices: z.record(
    z.string(),
    z.object({ partnerId: z.string().min(1), service: z.string().min(1) }),
  ).optional(),
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
  }).optional(),
});

const intentSchema = z.object({
  quoteId: z.string().uuid(),
  provider: z.enum(["stripe", "paypal", "razorpay", "mock"]),
  deliveryAddress: z.string().min(3).max(500),
  scenario: z.enum(["success", "failure", "cancelled", "requires_action", "pending", "timeout"]).optional(),
});
const clientConfirmationSchema = z.object({
  providerPaymentId: z.string().min(1).max(255),
  providerSessionId: z.string().min(1).max(255),
  signature: z.string().min(1).max(1024),
});

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const orderNumber = () => `AGC${new Date().getFullYear().toString().slice(-2)}-${Math.floor(100000 + Math.random() * 900000)}`;

export function registerPaymentRoutes(app: Express, deps: PaymentRouteDeps): void {
  app.get("/api/payments/methods", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    const cart = await storage.getCart(userId);
    const sellerIds = Array.from(new Set(cart.map((item) => item.product.farmerId)));
    const currency = paymentCurrencySchema.parse(req.query.currency ?? "GBP");
    const methods = await Promise.all(
      (["mock", "stripe", "paypal", "razorpay"] as const).map((provider) =>
        eligibilityService.evaluate(
          provider,
          currency,
          sellerIds,
          sellerIds.length,
          { allowUiPreview: true },
        ),
      ),
    );
    res.json({
      currency,
      protectionLabel: "Protected payment",
      uiPreviewEnabled: paymentRuntimeConfig.uiPreviewEnabled,
      methods,
    });
  });

  app.post("/api/checkout/quotes", isAuthenticated, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      const input = quoteSchema.parse(req.body);
      const cart = await storage.getCart(userId);
      if (!cart.length) return res.status(400).json({ error: "Cart is empty" });
      if (input.currency !== "GBP") {
        return res.status(400).json({ error: "Existing catalog products are currently priced in GBP" });
      }
      const availability = await storage.validateCart(cart.map((item) => ({ productId: item.productId, quantity: item.quantity })));
      if (!availability.ok) return res.status(409).json({ error: "Cart availability changed", issues: availability.issues });
      if (cart.some((item) => item.product.farmerId === userId)) {
        return res.status(400).json({ error: "You cannot order your own product" });
      }
      const rawSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      let shippingMinor: bigint;
      if (input.shippingChoices && input.deliveryAddressStruct) {
        const drop = geocodePostcode({
          postcode: input.deliveryAddressStruct.postcode,
          country: input.deliveryAddressStruct.country,
        });
        const bySeller = new Map<string, typeof cart>();
        for (const item of cart) {
          const group = bySeller.get(item.product.farmerId) ?? [];
          group.push(item);
          bySeller.set(item.product.farmerId, group);
        }
        let shippingPence = 0;
        for (const [sellerId, sellerItems] of Array.from(bySeller.entries())) {
          const choice = input.shippingChoices[sellerId];
          if (!choice) return res.status(400).json({ error: "Shipping selection is required for every seller" });
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
          const selected = quotes.quotes.find(
            (quote) => quote.partnerId === choice.partnerId && quote.service === choice.service,
          );
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
      const pricing = pricingService.quote(cart, input.currency, shippingMinor, paymentRuntimeConfig.platformFeeBps);
      const sellerIds = Array.from(new Set(cart.map((item) => item.product.farmerId)));
      const fingerprint = hash(cart.map((item) => [item.productId, item.quantity, item.product.price, item.product.stock]));
      const expiresAt = new Date(Date.now() + paymentRuntimeConfig.quoteTtlMinutes * 60_000);
      const quote = await paymentRepository.createQuote({
        buyerId: userId,
        currency: input.currency,
        subtotalMinor: BigInt(pricing.subtotal.amountMinor),
        taxMinor: BigInt(pricing.tax.amountMinor),
        shippingMinor: BigInt(pricing.shipping.amountMinor),
        platformFeeMinor: BigInt(pricing.platformFee.amountMinor),
        totalMinor: BigInt(pricing.total.amountMinor),
        cartFingerprint: fingerprint,
        quoteData: {
          deliveryMethod: input.deliveryMethod,
          sellerIds,
          itemCount: cart.length,
          shippingChoices: input.shippingChoices,
          deliveryAddressStruct: input.deliveryAddressStruct,
        },
        expiresAt,
      });
      res.status(201).json({
        id: quote.id,
        currency: quote.currency,
        pricing,
        expiresAt: quote.expiresAt,
        sellerCount: sellerIds.length,
      });
    } catch (error) {
      res.status(400).json({ error: "Unable to create checkout quote" });
    }
  });

  app.post("/api/checkout/intents", isAuthenticated, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      const idempotencyKey = req.get("Idempotency-Key")?.trim();
      if (!idempotencyKey || idempotencyKey.length > 160) {
        return res.status(400).json({ error: "A valid Idempotency-Key header is required" });
      }
      const input = intentSchema.parse(req.body);
      const idempotencyReference = `${userId}:${idempotencyKey}`;
      const existingAttempt = await paymentRepository.getAttemptByIdempotency(input.provider, idempotencyReference);
      if (existingAttempt) {
        return res.status(200).json({
          orderId: existingAttempt.orderId,
          attemptId: existingAttempt.id,
          nextAction: { type: "wait", attemptId: existingAttempt.id },
          idempotentReplay: true,
        });
      }
      const quote = await paymentRepository.getQuote(input.quoteId);
      if (!quote || quote.buyerId !== userId) return res.status(404).json({ error: "Checkout quote not found" });
      if (quote.expiresAt <= new Date()) return res.status(409).json({ error: "Checkout quote expired", code: "quote_required" });
      const cart = await storage.getCart(userId);
      const fingerprint = hash(cart.map((item) => [item.productId, item.quantity, item.product.price, item.product.stock]));
      if (fingerprint !== quote.cartFingerprint) return res.status(409).json({ error: "Cart changed", code: "quote_required" });
      const sellerIds = Array.from(new Set(cart.map((item) => item.product.farmerId)));
      const eligibility = await eligibilityService.evaluate(input.provider, quote.currency as "GBP" | "INR", sellerIds, sellerIds.length);
      if (!eligibility.eligible) return res.status(409).json({ error: "Payment method unavailable", reasons: eligibility.reasons });
      const user = await authStorage.getUser(userId);
      const now = new Date();
      const quoteData = quote.quoteData as {
        deliveryMethod?: Order["deliveryMethod"];
        shippingChoices?: Order["shippingChoices"];
        deliveryAddressStruct?: Order["deliveryAddressStruct"];
      };
      const items: OrderItem[] = cart.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images?.[0],
        quantity: item.quantity,
        price: item.product.price,
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
        deliveryAddress: input.deliveryAddress,
        deliveryMethod: quoteData.deliveryMethod ?? "standard",
        paymentMethod: input.provider === "mock" ? "card" : input.provider,
        paymentStatus: "pending",
        shippingChoices: quoteData.shippingChoices,
        deliveryAddressStruct: quoteData.deliveryAddressStruct,
        createdAt: now.toISOString(),
      };
      const records = await checkoutRepository.create({
        order,
        quoteId: quote.id,
        provider: input.provider,
        amountMinor: quote.totalMinor.toString(),
        currency: quote.currency as "GBP" | "INR",
        idempotencyReference,
        requestFingerprint: hash({ input, quoteId: quote.id }),
        expiresAt: new Date(Date.now() + paymentRuntimeConfig.reservationTtlMinutes * 60_000),
      });
      const sellerAccounts =
        input.provider === "mock"
          ? []
          : await paymentOperationsRepository.getSellerPaymentAccounts(input.provider, sellerIds);
      const accountBySeller = new Map(
        sellerAccounts.map((account) => [account.sellerId, account.providerAccountId]),
      );
      const sellerSubtotals = sellerIds.map((sellerId) => ({
        sellerId,
        subtotalMinor: BigInt(
          Math.round(
            cart
              .filter((item) => item.product.farmerId === sellerId)
              .reduce((sum, item) => sum + item.product.price * item.quantity, 0) * 100,
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
      let result;
      try {
        result = await paymentService.executeProviderCall(input.provider, {
          attemptId: records.attemptId,
          orderId: order.id,
          idempotencyReference,
          amount: { currency: quote.currency as "GBP" | "INR", amountMinor: quote.totalMinor.toString() },
          sellerIds,
          allocationCount: sellerIds.length,
          allocations,
          returnBaseUrl: paymentRuntimeConfig.returnBaseUrl ?? `${req.protocol}://${req.get("host")}`,
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
      res.status(400).json({ error: "Unable to create checkout intent" });
    }
  });

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
