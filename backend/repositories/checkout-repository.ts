import { pool } from "../config/db";
import type { Order } from "@shared/schema";
import type { ProviderName } from "../payments/types";

const toMinor = (value: number): string => Math.round(value * 100).toString();

export interface CreateCheckoutRecordsInput {
  order: Order;
  quoteId: string;
  provider: ProviderName;
  amountMinor: string;
  currency: "GBP" | "INR";
  idempotencyReference: string;
  requestFingerprint: string;
  expiresAt: Date;
}

export interface CreateCashOrderInput {
  order: Order;
  quoteId: string;
  currency: "GBP";
  idempotencyKey: string;
  reservationExpiresAt: Date;
}

export class CheckoutRepository {
  async getQuoteUsage(
    quoteId: string,
  ): Promise<
    | {
        orderId: string;
        attemptId?: string;
        paymentStatus?: string;
        kind: "online" | "cash";
      }
    | undefined
  > {
    const online = await pool.query(
      `SELECT ci.order_id,pa.id AS attempt_id,pa.payment_status
       FROM checkout_intents ci
       JOIN payment_attempts pa ON pa.checkout_intent_id=ci.id
       WHERE ci.quote_id=$1
         AND pa.payment_status NOT IN ('cancelled','failed')
       ORDER BY pa.created_at DESC
       LIMIT 1`,
      [quoteId],
    );
    if (online.rows[0]) {
      return {
        orderId: online.rows[0].order_id,
        attemptId: online.rows[0].attempt_id,
        paymentStatus: online.rows[0].payment_status,
        kind: "online",
      };
    }
    const cash = await pool.query(
      `SELECT order_id FROM cash_checkout_requests
       WHERE quote_id=$1 AND order_id IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [quoteId],
    );
    return cash.rows[0]
      ? { orderId: cash.rows[0].order_id, kind: "cash" }
      : undefined;
  }

  async getQuoteIdForAttempt(attemptId: string): Promise<string | undefined> {
    const result = await pool.query(
      `SELECT ci.quote_id
       FROM payment_attempts pa
       JOIN checkout_intents ci ON ci.id=pa.checkout_intent_id
       WHERE pa.id=$1
       LIMIT 1`,
      [attemptId],
    );
    return result.rows[0]?.quote_id;
  }

  async getCashOrderByIdempotency(
    buyerId: string,
    idempotencyKey: string,
  ): Promise<{ quoteId: string; orderId?: string } | undefined> {
    const result = await pool.query(
      `SELECT quote_id,order_id FROM cash_checkout_requests
       WHERE buyer_id=$1 AND idempotency_key=$2`,
      [buyerId, idempotencyKey],
    );
    if (!result.rows[0]) return undefined;
    return {
      quoteId: result.rows[0].quote_id,
      orderId: result.rows[0].order_id ?? undefined,
    };
  }

  async create(input: CreateCheckoutRecordsInput): Promise<{ intentId: string; attemptId: string }> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        "SELECT id, checkout_intent_id FROM payment_attempts WHERE provider=$1 AND idempotency_reference=$2",
        [input.provider, input.idempotencyReference],
      );
      if (existing.rows[0]) {
        await client.query("COMMIT");
        return { intentId: existing.rows[0].checkout_intent_id, attemptId: existing.rows[0].id };
      }

      const quantities = new Map<string, number>();
      for (const item of input.order.items) {
        quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
      }
      for (const [productId, quantity] of Array.from(quantities.entries())) {
        const product = await client.query(
          "SELECT stock FROM commerce_products WHERE id=$1 FOR UPDATE",
          [productId],
        );
        if (!product.rows[0]) throw new Error(`Product not found: ${productId}`);
        if (product.rows[0].stock < quantity) throw new Error(`Insufficient stock for product ${productId}`);
      }

      await client.query(
        `INSERT INTO commerce_orders
          (id,order_number,buyer_id,status,payment_method,payment_status,currency,
           subtotal_minor,tax_minor,delivery_fee_minor,shipping_total_minor,total_minor,
           order_data,stock_restored,created_at,updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,false,$14,$14)`,
        [
          input.order.id, input.order.orderNumber, input.order.buyerId, input.order.status,
          input.order.paymentMethod, input.order.paymentStatus, input.currency,
          toMinor(input.order.subtotal), toMinor(input.order.tax), toMinor(input.order.deliveryFee),
          toMinor(input.order.shippingTotal ?? 0), toMinor(input.order.total),
          JSON.stringify(input.order), input.order.createdAt,
        ],
      );
      for (const item of input.order.items) {
        await client.query(
          `INSERT INTO commerce_order_items
            (order_id,product_id,seller_id,quantity,unit_price_minor,currency,item_data)
           VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
          [input.order.id, item.productId, item.farmerId, item.quantity, toMinor(item.price), input.currency, JSON.stringify(item)],
        );
        await client.query("UPDATE commerce_products SET stock=stock-$2,updated_at=now() WHERE id=$1", [item.productId, item.quantity]);
        await client.query(
          `INSERT INTO inventory_reservations(order_id,product_id,buyer_id,quantity,status,expires_at)
           VALUES($1,$2,$3,$4,'active',$5)`,
          [input.order.id, item.productId, input.order.buyerId, item.quantity, input.expiresAt],
        );
      }
      for (const history of input.order.statusHistory) {
        await client.query(
          "INSERT INTO commerce_order_status_history(order_id,status,note,occurred_at) VALUES($1,$2,$3,$4)",
          [input.order.id, history.status, history.note ?? null, history.timestamp],
        );
      }
      const intent = await client.query(
        `INSERT INTO checkout_intents(quote_id,order_id,buyer_id,provider,status,expires_at)
         VALUES($1,$2,$3,$4,'created',$5) RETURNING id`,
        [input.quoteId, input.order.id, input.order.buyerId, input.provider, input.expiresAt],
      );
      const attempt = await client.query(
        `INSERT INTO payment_attempts
          (checkout_intent_id,order_id,provider,currency,amount_minor,payment_status,
           provider_call_status,reconciliation_status,idempotency_reference,request_fingerprint)
         VALUES($1,$2,$3,$4,$5,'created','queued','not_required',$6,$7) RETURNING id`,
        [intent.rows[0].id, input.order.id, input.provider, input.currency, input.amountMinor, input.idempotencyReference, input.requestFingerprint],
      );
      await client.query(
        `INSERT INTO payment_jobs(job_type,aggregate_id,status,payload)
         VALUES('provider_checkout',$1,'queued',$2::jsonb)`,
        [attempt.rows[0].id, JSON.stringify({ provider: input.provider, attemptId: attempt.rows[0].id })],
      );
      await client.query("COMMIT");
      return { intentId: intent.rows[0].id, attemptId: attempt.rows[0].id };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createCashOrder(input: CreateCashOrderInput): Promise<{ orderId: string; replayed: boolean }> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const insertedRequest = await client.query(
        `INSERT INTO cash_checkout_requests (buyer_id,idempotency_key,quote_id)
         VALUES($1,$2,$3)
         ON CONFLICT (buyer_id,idempotency_key) DO NOTHING
         RETURNING id`,
        [input.order.buyerId, input.idempotencyKey, input.quoteId],
      );
      if (!insertedRequest.rows[0]) {
        const existing = await client.query(
          `SELECT quote_id,order_id FROM cash_checkout_requests
           WHERE buyer_id=$1 AND idempotency_key=$2 FOR UPDATE`,
          [input.order.buyerId, input.idempotencyKey],
        );
        if (!existing.rows[0] || existing.rows[0].quote_id !== input.quoteId) {
          throw new Error("Idempotency key was already used for another checkout");
        }
        if (!existing.rows[0].order_id) {
          throw new Error("Cash checkout is still being created");
        }
        await client.query("COMMIT");
        return { orderId: existing.rows[0].order_id, replayed: true };
      }

      const quantities = new Map<string, number>();
      for (const item of input.order.items) {
        quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
      }
      for (const [productId, quantity] of Array.from(quantities.entries())) {
        const product = await client.query(
          "SELECT stock FROM commerce_products WHERE id=$1 FOR UPDATE",
          [productId],
        );
        if (!product.rows[0]) throw new Error(`Product not found: ${productId}`);
        if (product.rows[0].stock < quantity) {
          throw new Error(`Insufficient stock for product ${productId}`);
        }
      }

      await client.query(
        `INSERT INTO commerce_orders
          (id,order_number,buyer_id,status,payment_method,payment_status,currency,
           subtotal_minor,tax_minor,delivery_fee_minor,shipping_total_minor,total_minor,
           order_data,stock_restored,created_at,updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,false,$14,$14)`,
        [
          input.order.id, input.order.orderNumber, input.order.buyerId, input.order.status,
          input.order.paymentMethod, input.order.paymentStatus, input.currency,
          toMinor(input.order.subtotal), toMinor(input.order.tax), toMinor(input.order.deliveryFee),
          toMinor(input.order.shippingTotal ?? 0), toMinor(input.order.total),
          JSON.stringify(input.order), input.order.createdAt,
        ],
      );
      for (const item of input.order.items) {
        await client.query(
          `INSERT INTO commerce_order_items
            (order_id,product_id,seller_id,quantity,unit_price_minor,currency,item_data)
           VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
          [
            input.order.id, item.productId, item.farmerId, item.quantity,
            toMinor(item.price), input.currency, JSON.stringify(item),
          ],
        );
        await client.query(
          "UPDATE commerce_products SET stock=stock-$2,updated_at=now() WHERE id=$1",
          [item.productId, item.quantity],
        );
        await client.query(
          `INSERT INTO inventory_reservations
            (order_id,product_id,buyer_id,quantity,status,expires_at)
           VALUES($1,$2,$3,$4,'consumed',$5)`,
          [
            input.order.id, item.productId, input.order.buyerId,
            item.quantity, input.reservationExpiresAt,
          ],
        );
      }
      for (const history of input.order.statusHistory) {
        await client.query(
          `INSERT INTO commerce_order_status_history(order_id,status,note,occurred_at)
           VALUES($1,$2,$3,$4)`,
          [input.order.id, history.status, history.note ?? null, history.timestamp],
        );
      }
      await client.query(
        `UPDATE cash_checkout_requests
         SET order_id=$2,updated_at=now() WHERE id=$1`,
        [insertedRequest.rows[0].id, input.order.id],
      );
      for (const [productId, quantity] of Array.from(quantities.entries())) {
        await client.query(
          `DELETE FROM commerce_cart_items ci USING commerce_carts c
           WHERE ci.cart_id=c.id AND c.user_id=$1 AND ci.product_id=$2
             AND ci.quantity<=$3`,
          [input.order.buyerId, productId, quantity],
        );
        await client.query(
          `UPDATE commerce_cart_items ci
           SET quantity=ci.quantity-$3,updated_at=now()
           FROM commerce_carts c
           WHERE ci.cart_id=c.id AND c.user_id=$1 AND ci.product_id=$2
             AND ci.quantity>$3`,
          [input.order.buyerId, productId, quantity],
        );
      }
      await client.query("COMMIT");
      return { orderId: input.order.id, replayed: false };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export const checkoutRepository = new CheckoutRepository();
