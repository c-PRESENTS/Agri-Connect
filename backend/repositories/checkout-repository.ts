import { pool } from "../config/db";
import type { Order } from "@shared/schema";

const toMinor = (value: number): string => Math.round(value * 100).toString();

export interface CreateCheckoutRecordsInput {
  order: Order;
  quoteId: string;
  provider: "mock";
  amountMinor: string;
  currency: "GBP" | "INR";
  idempotencyReference: string;
  requestFingerprint: string;
  expiresAt: Date;
}

export class CheckoutRepository {
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
}

export const checkoutRepository = new CheckoutRepository();
