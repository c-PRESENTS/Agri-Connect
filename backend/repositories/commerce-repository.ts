import { pool } from "../config/db";
import type { CartItem, Order, Product } from "@shared/schema";
import { productCompatibilityPublicationStatus, productPublicVisibilitySql } from "../catalog/product-visibility";

const toMinor = (value: number): string => Math.round(value * 100).toString();
const fromMinor = (value: string | number): number => Number(value) / 100;

function hydrateProduct(row: Record<string, any>): Product {
  const stored = row.product_data as Product;
  const moderationStatus = row.moderation_status ?? stored.moderationStatus ?? "approved";
  return {
    ...stored,
    id: row.id,
    name: row.name,
    description: row.description,
    price: fromMinor(row.price_minor),
    currency: row.currency,
    unit: row.unit,
    stock: row.stock,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    farmerId: row.farmer_id,
    farmerName: row.seller_name ?? stored.farmerName,
    farmerAvatar: row.seller_avatar ?? stored.farmerAvatar,
    farmerLocation: row.seller_location ?? stored.farmerLocation,
    farmerLatitude: row.seller_latitude == null ? 0 : Number(row.seller_latitude),
    farmerLongitude: row.seller_longitude == null ? 0 : Number(row.seller_longitude),
    farmerRating:
      row.seller_rating == null ? stored.farmerRating : Number(row.seller_rating),
    farmerIsOnline: row.seller_is_online === true,
    farmerIsVerified: row.seller_is_verified === true,
    regionId: row.region_id ?? stored.regionId,
    isFeatured: row.is_featured ?? stored.isFeatured ?? false,
    isFreshPick: row.is_fresh_pick ?? stored.isFreshPick ?? false,
    moderationStatus,
    moderationReason: row.moderation_reason ?? stored.moderationReason ?? undefined,
    moderationVersion: row.moderation_version == null ? stored.moderationVersion : Number(row.moderation_version),
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : stored.submittedAt,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : stored.reviewedAt,
    reviewedBy: row.reviewed_by ?? stored.reviewedBy,
    publicationStatus: productCompatibilityPublicationStatus(moderationStatus),
    publicationReason: row.moderation_reason ?? stored.publicationReason ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : stored.createdAt,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : stored.updatedAt,
    isPubliclyVisible: row.product_is_public == null ? undefined : row.product_is_public === true,
  };
}

const SELLER_LOCATION_SELECT = `
  COALESCE(NULLIF(u.name,''), NULLIF(concat_ws(' ',u.first_name,u.last_name),''), u.email) AS seller_name,
  COALESCE(u.avatar,u.profile_image_url) AS seller_avatar,
  u.location AS seller_location,
  u.latitude AS seller_latitude,
  u.longitude AS seller_longitude,
  u.rating AS seller_rating,
  u.is_online AS seller_is_online,
  (u.account_status='active' AND ((u.auth_method='catalog_seed' AND u.is_verified=true) OR EXISTS (
    SELECT 1 FROM seller_verification_cases verified_case
    WHERE verified_case.seller_id=u.id AND verified_case.status='verified'
      AND (verified_case.expires_at IS NULL OR verified_case.expires_at>now())
  ))) AS seller_is_verified`;

function hydrateOrder(row: Record<string, any>): Order {
  const order = row.order_data as Order;
  return {
    ...order,
    id: row.id,
    orderNumber: row.order_number,
    buyerId: row.buyer_id,
    status: row.status,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    subtotal: fromMinor(row.subtotal_minor),
    tax: fromMinor(row.tax_minor),
    deliveryFee: fromMinor(row.delivery_fee_minor),
    shippingTotal: fromMinor(row.shipping_total_minor) || undefined,
    total: fromMinor(row.total_minor),
    stockRestored: row.stock_restored,
  } as Order;
}

export class CommerceRepository {
  async seedProducts(products: Product[]): Promise<void> {
    if (products.length === 0) return;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const catalogFarmers = new Map<
        string,
        Pick<
          Product,
          | "farmerId"
          | "farmerName"
          | "farmerAvatar"
          | "farmerLocation"
          | "farmerLatitude"
          | "farmerLongitude"
          | "farmerRating"
        >
      >();
      const farmerRegionIds = new Map<string, string>();
      for (const product of products) {
        if (!product.farmerId || product.farmerId.startsWith("farmer-") || product.farmerId.startsWith("catalog-")) continue;
        if (!product.farmerName?.trim()) continue;
        if (!catalogFarmers.has(product.farmerId)) {
          catalogFarmers.set(product.farmerId, {
            farmerId: product.farmerId,
            farmerName: product.farmerName,
            farmerAvatar: product.farmerAvatar,
            farmerLocation: product.farmerLocation,
            farmerLatitude: product.farmerLatitude,
            farmerLongitude: product.farmerLongitude,
            farmerRating: product.farmerRating,
          });
        }
      }
      for (const farmer of Array.from(catalogFarmers.values())) {
        const [firstName, ...lastNameParts] = farmer.farmerName.trim().split(/\s+/);
        await client.query(
          `INSERT INTO users
             (id, auth_method, first_name, last_name, role, name, avatar, location,
              latitude, longitude, rating, is_verified, profile_complete)
           VALUES ($1,'catalog_seed',$2,$3,'farmer',$4,$5,$6,$7,$8,$9,true,true)
           ON CONFLICT (id) DO NOTHING`,
          [
            farmer.farmerId,
            firstName || farmer.farmerName,
            lastNameParts.join(" ") || null,
            farmer.farmerName,
            farmer.farmerAvatar,
            farmer.farmerLocation,
            farmer.farmerLatitude,
            farmer.farmerLongitude,
            farmer.farmerRating,
          ],
        );
        const region = await client.query(
          `SELECT id,name FROM market_regions WHERE active=true AND lower(name)=lower($1) LIMIT 1`,
          [farmer.farmerLocation],
        );
        if (region.rows[0]) {
          farmerRegionIds.set(farmer.farmerId, region.rows[0].id);
          await client.query(
            `INSERT INTO seller_region_assignments
               (seller_id,organisation_id,region_id,status,can_publish,can_fulfil,approved_at,effective_at,reason)
             VALUES ($1,'agriconnect-platform',$2,'active',true,true,now(),now(),'Approved catalogue seller')
             ON CONFLICT (seller_id,region_id) DO UPDATE SET
               status='active',can_publish=true,can_fulfil=true,updated_at=now()`,
            [farmer.farmerId, region.rows[0].id],
          );
        }
      }
      for (const product of products) {
        const regionId = farmerRegionIds.get(product.farmerId) ?? null;
        const persistedProduct = regionId ? { ...product, regionId } : product;
        await client.query(
          `INSERT INTO commerce_products
             (id, name, description, price_minor, currency, unit, stock, category_id,
              subcategory_id, farmer_id, product_data, region_id, moderation_status,
              reviewed_at, is_featured, is_fresh_pick, created_at, updated_at)
           VALUES ($1,$2,$3,$4,'GBP',$5,$6,$7,$8,$9,$10::jsonb,$11,'approved',$12,$13,$14,$12,$12)
           ON CONFLICT (id) DO UPDATE SET
             region_id=COALESCE(commerce_products.region_id,EXCLUDED.region_id),
             product_data=CASE WHEN commerce_products.region_id IS NULL AND EXCLUDED.region_id IS NOT NULL
               THEN jsonb_set(commerce_products.product_data,'{regionId}',to_jsonb(EXCLUDED.region_id::text),true)
               ELSE commerce_products.product_data END,
             updated_at=now()`,
          [
            product.id,
            product.name,
            product.description,
            toMinor(product.price),
            product.unit,
            product.stock,
            product.categoryId,
            product.subcategoryId,
            product.farmerId,
            JSON.stringify(persistedProduct),
            regionId,
            product.createdAt,
            product.isFeatured === true,
            product.isFreshPick === true,
          ],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listProducts(): Promise<Product[]> {
    const result = await pool.query(
      `SELECT p.*, ${SELLER_LOCATION_SELECT}
         FROM commerce_products p
         LEFT JOIN users u ON u.id=p.farmer_id
        WHERE u.account_status='active'
        ORDER BY p.created_at DESC, p.id`,
    );
    return result.rows.map(hydrateProduct);
  }

  async listPublicProducts(): Promise<Product[]> {
    const result = await pool.query(
      `SELECT p.*, ${SELLER_LOCATION_SELECT}
         FROM commerce_products p
         JOIN users u ON u.id=p.farmer_id
        WHERE ${productPublicVisibilitySql("p", "u")}
        ORDER BY p.created_at DESC, p.id`,
    );
    return result.rows.map(hydrateProduct);
  }

  async listVerifiedDatabaseSellerProducts(): Promise<Product[]> {
    const result = await pool.query(
      `SELECT p.*, ${SELLER_LOCATION_SELECT}
         FROM commerce_products p
         JOIN users u ON u.id=p.farmer_id
        WHERE u.auth_method<>'catalog_seed'
          AND (u.role='farmer' OR u.seller_enabled=true)
          AND ${productPublicVisibilitySql("p", "u")}
        ORDER BY p.created_at DESC,p.id`,
    );
    return result.rows.map(hydrateProduct);
  }

  async listApprovedMarketplaceProducts(): Promise<Product[]> {
    const result = await pool.query(
      `SELECT p.*, ${SELLER_LOCATION_SELECT},r.name AS region_name
         FROM commerce_products p
         JOIN seller_region_assignments sra ON sra.seller_id=p.farmer_id AND sra.region_id=p.region_id
         JOIN market_regions r ON r.id=p.region_id AND r.active=true
         LEFT JOIN users u ON u.id=p.farmer_id
        WHERE sra.status='active' AND sra.can_publish=true
          AND (sra.effective_at IS NULL OR sra.effective_at<=now())
          AND (sra.expires_at IS NULL OR sra.expires_at>now())
          AND ${productPublicVisibilitySql("p", "u")}
        ORDER BY p.created_at DESC,p.id`,
    );
    return result.rows.map((row: Record<string, any>) => ({ ...hydrateProduct(row), regionName: row.region_name }));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await pool.query(
      `SELECT p.*, ${SELLER_LOCATION_SELECT}
         FROM commerce_products p
         JOIN users u ON u.id=p.farmer_id
        WHERE p.id=$1 AND ${productPublicVisibilitySql("p", "u")}`,
      [id],
    );
    return result.rows[0] ? hydrateProduct(result.rows[0]) : undefined;
  }

  async getProductForManagement(id: string): Promise<Product | undefined> {
    const result = await pool.query(
      `SELECT p.*, ${SELLER_LOCATION_SELECT}
         FROM commerce_products p
         LEFT JOIN users u ON u.id=p.farmer_id
        WHERE p.id=$1`,
      [id],
    );
    return result.rows[0] ? hydrateProduct(result.rows[0]) : undefined;
  }

  async saveProduct(product: Product): Promise<Product> {
    const result = await pool.query(
      `INSERT INTO commerce_products
         (id, name, description, price_minor, currency, unit, stock, category_id,
          subcategory_id, farmer_id, product_data, region_id, moderation_status,
          submitted_at, reviewed_at, reviewed_by, moderation_reason, moderation_version,
          is_featured, is_fresh_pick, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'GBP',$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,now())
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, description=EXCLUDED.description, price_minor=EXCLUDED.price_minor,
         unit=EXCLUDED.unit, stock=EXCLUDED.stock, category_id=EXCLUDED.category_id,
         subcategory_id=EXCLUDED.subcategory_id, farmer_id=EXCLUDED.farmer_id,
         product_data=EXCLUDED.product_data, region_id=EXCLUDED.region_id,
         moderation_status=EXCLUDED.moderation_status, submitted_at=EXCLUDED.submitted_at,
         reviewed_at=EXCLUDED.reviewed_at, reviewed_by=EXCLUDED.reviewed_by,
         moderation_reason=EXCLUDED.moderation_reason, moderation_version=EXCLUDED.moderation_version,
         is_featured=EXCLUDED.is_featured, is_fresh_pick=EXCLUDED.is_fresh_pick, updated_at=now()
       RETURNING *`,
      [
        product.id,
        product.name,
        product.description,
        toMinor(product.price),
        product.unit,
        product.stock,
        product.categoryId,
        product.subcategoryId,
        product.farmerId,
        JSON.stringify(product),
        product.regionId ?? null,
        product.moderationStatus ?? "draft",
        product.submittedAt ? new Date(product.submittedAt) : null,
        product.reviewedAt ? new Date(product.reviewedAt) : null,
        product.reviewedBy ?? null,
        product.moderationReason ?? product.publicationReason ?? null,
        product.moderationVersion ?? 1,
        product.isFeatured === true,
        product.isFreshPick === true,
        product.createdAt,
      ],
    );
    return hydrateProduct(result.rows[0]);
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await pool.query("DELETE FROM commerce_products WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private async ensureCart(userId: string): Promise<string> {
    const result = await pool.query(
      `INSERT INTO commerce_carts (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET updated_at=now()
       RETURNING id`,
      [userId],
    );
    return result.rows[0].id;
  }

  async getCart(userId: string): Promise<CartItem[]> {
    const result = await pool.query(
      `SELECT ci.*, p.*, ${SELLER_LOCATION_SELECT},
              (${productPublicVisibilitySql("p", "u")}) AS product_is_public,
              ci.id AS cart_item_id, ci.quantity AS cart_quantity,
              ci.unit_price_minor AS cart_unit_price_minor
       FROM commerce_carts c
       JOIN commerce_cart_items ci ON ci.cart_id=c.id
       JOIN commerce_products p ON p.id=ci.product_id
       LEFT JOIN users u ON u.id=p.farmer_id
       WHERE c.user_id=$1
       ORDER BY ci.created_at`,
      [userId],
    );
    return result.rows.map((row: Record<string, any>) => ({
      id: row.cart_item_id,
      productId: row.product_id,
      product: hydrateProduct(row),
      quantity: row.cart_quantity,
      unitPrice: row.cart_unit_price_minor == null ? undefined : fromMinor(row.cart_unit_price_minor),
      purchaseMode: row.purchase_mode ?? undefined,
      subFrequency: row.sub_frequency ?? undefined,
    }));
  }

  async putCartItem(
    userId: string,
    product: Product,
    quantity: number,
    options?: Pick<CartItem, "unitPrice" | "purchaseMode" | "subFrequency">,
  ): Promise<CartItem> {
    const cartId = await this.ensureCart(userId);
    const result = await pool.query(
      `INSERT INTO commerce_cart_items
         (cart_id, product_id, quantity, unit_price_minor, purchase_mode, sub_frequency)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (cart_id, product_id) DO UPDATE SET
         quantity=commerce_cart_items.quantity + EXCLUDED.quantity,
         unit_price_minor=COALESCE(EXCLUDED.unit_price_minor, commerce_cart_items.unit_price_minor),
         purchase_mode=COALESCE(EXCLUDED.purchase_mode, commerce_cart_items.purchase_mode),
         sub_frequency=COALESCE(EXCLUDED.sub_frequency, commerce_cart_items.sub_frequency),
         updated_at=now()
       RETURNING id, quantity, unit_price_minor, purchase_mode, sub_frequency`,
      [
        cartId,
        product.id,
        quantity,
        options?.unitPrice == null ? null : toMinor(options.unitPrice),
        options?.purchaseMode ?? null,
        options?.subFrequency ?? null,
      ],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      productId: product.id,
      product,
      quantity: row.quantity,
      unitPrice: row.unit_price_minor == null ? undefined : fromMinor(row.unit_price_minor),
      purchaseMode: row.purchase_mode ?? undefined,
      subFrequency: row.sub_frequency ?? undefined,
    };
  }

  async updateCartItem(userId: string, itemId: string, quantity: number): Promise<void> {
    await pool.query(
      `UPDATE commerce_cart_items ci SET quantity=$3, updated_at=now()
       FROM commerce_carts c WHERE ci.cart_id=c.id AND c.user_id=$1 AND ci.id=$2`,
      [userId, itemId, quantity],
    );
  }

  async removeCartItem(userId: string, itemId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM commerce_cart_items ci USING commerce_carts c
       WHERE ci.cart_id=c.id AND c.user_id=$1 AND ci.id=$2`,
      [userId, itemId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async clearCart(userId: string): Promise<void> {
    await pool.query(
      `DELETE FROM commerce_cart_items ci USING commerce_carts c
       WHERE ci.cart_id=c.id AND c.user_id=$1`,
      [userId],
    );
  }

  async removePurchasedCartItems(
    userId: string,
    items: Array<{ productId: string; quantity: number }>,
  ): Promise<void> {
    if (items.length === 0) return;
    const quantities = new Map<string, number>();
    for (const item of items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity,
      );
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const [productId, quantity] of Array.from(quantities.entries())) {
        await client.query(
          `DELETE FROM commerce_cart_items ci USING commerce_carts c
           WHERE ci.cart_id=c.id AND c.user_id=$1 AND ci.product_id=$2
             AND ci.quantity<=$3`,
          [userId, productId, quantity],
        );
        await client.query(
          `UPDATE commerce_cart_items ci
           SET quantity=ci.quantity-$3,updated_at=now()
           FROM commerce_carts c
           WHERE ci.cart_id=c.id AND c.user_id=$1 AND ci.product_id=$2
             AND ci.quantity>$3`,
          [userId, productId, quantity],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createOrder(order: Order): Promise<Order> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const quantities = new Map<string, number>();
      for (const item of order.items) {
        quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
      }
      for (const [productId, quantity] of Array.from(quantities.entries())) {
        const locked = await client.query(
          `SELECT p.stock
             FROM commerce_products p
             JOIN users u ON u.id=p.farmer_id
            WHERE p.id=$1 AND ${productPublicVisibilitySql("p", "u")}
            FOR UPDATE OF p`,
          [productId],
        );
        if (!locked.rows[0]) throw new Error(`Product is not currently available: ${productId}`);
        if (locked.rows[0].stock < quantity) throw new Error(`Insufficient stock for product ${productId}`);
      }
      await client.query(
        `INSERT INTO commerce_orders
           (id, order_number, buyer_id, status, payment_method, payment_status, currency,
            subtotal_minor, tax_minor, delivery_fee_minor, shipping_total_minor, total_minor,
            order_data, stock_restored, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'GBP',$7,$8,$9,$10,$11,$12::jsonb,false,$13,$13)`,
        [
          order.id, order.orderNumber, order.buyerId, order.status, order.paymentMethod,
          order.paymentStatus, toMinor(order.subtotal), toMinor(order.tax),
          toMinor(order.deliveryFee), toMinor(order.shippingTotal ?? 0), toMinor(order.total),
          JSON.stringify(order), order.createdAt,
        ],
      );
      for (const item of order.items) {
        await client.query(
          `INSERT INTO commerce_order_items
             (order_id, product_id, seller_id, quantity, unit_price_minor, currency, item_data)
           VALUES ($1,$2,$3,$4,$5,'GBP',$6::jsonb)`,
          [order.id, item.productId, item.farmerId, item.quantity, toMinor(item.price), JSON.stringify(item)],
        );
        await client.query(
          "UPDATE commerce_products SET stock=stock-$2, updated_at=now() WHERE id=$1",
          [item.productId, item.quantity],
        );
        await client.query(
          `INSERT INTO inventory_reservations
             (order_id, product_id, buyer_id, quantity, status, expires_at)
           VALUES ($1,$2,$3,$4,'consumed',now())`,
          [order.id, item.productId, order.buyerId, item.quantity],
        );
      }
      for (const history of order.statusHistory) {
        await client.query(
          `INSERT INTO commerce_order_status_history (order_id, status, note, occurred_at)
           VALUES ($1,$2,$3,$4)`,
          [order.id, history.status, history.note ?? null, history.timestamp],
        );
      }
      await client.query("COMMIT");
      return order;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const result = await pool.query("SELECT * FROM commerce_orders WHERE id=$1", [id]);
    return result.rows[0] ? hydrateOrder(result.rows[0]) : undefined;
  }

  async listOrders(whereSql = "", params: unknown[] = []): Promise<Order[]> {
    const result = await pool.query(
      `SELECT * FROM commerce_orders ${whereSql} ORDER BY created_at DESC`,
      params,
    );
    return result.rows.map(hydrateOrder);
  }

  async saveOrder(order: Order, appendHistory = false): Promise<Order> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE commerce_orders SET status=$2, payment_method=$3, payment_status=$4,
          order_data=$5::jsonb, stock_restored=$6, updated_at=now() WHERE id=$1`,
        [
          order.id, order.status, order.paymentMethod, order.paymentStatus,
          JSON.stringify(order), order.stockRestored ?? false,
        ],
      );
      if (appendHistory) {
        const history = order.statusHistory[order.statusHistory.length - 1];
        if (history) {
          await client.query(
            `INSERT INTO commerce_order_status_history (order_id,status,note,occurred_at)
             VALUES ($1,$2,$3,$4)`,
            [order.id, history.status, history.note ?? null, history.timestamp],
          );
        }
      }
      await client.query("COMMIT");
      return order;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async restoreStock(order: Order): Promise<Order> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query(
        "SELECT stock_restored FROM commerce_orders WHERE id=$1 FOR UPDATE",
        [order.id],
      );
      if (!locked.rows[0] || locked.rows[0].stock_restored) {
        await client.query("COMMIT");
        return { ...order, stockRestored: Boolean(locked.rows[0]?.stock_restored) };
      }
      for (const item of order.items) {
        await client.query(
          "UPDATE commerce_products SET stock=stock+$2, updated_at=now() WHERE id=$1",
          [item.productId, item.quantity],
        );
      }
      await client.query(
        `UPDATE inventory_reservations SET status='released',updated_at=now()
         WHERE order_id=$1 AND status='active'`,
        [order.id],
      );
      const restored = { ...order, stockRestored: true };
      await client.query(
        "UPDATE commerce_orders SET stock_restored=true, order_data=$2::jsonb, updated_at=now() WHERE id=$1",
        [order.id, JSON.stringify(restored)],
      );
      await client.query("COMMIT");
      return restored;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async expireActiveReservations(at = new Date()): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const expired = await client.query(
        `SELECT id, product_id, quantity FROM inventory_reservations
         WHERE status='active' AND expires_at<=$1 FOR UPDATE SKIP LOCKED`,
        [at],
      );
      for (const reservation of expired.rows) {
        await client.query(
          "UPDATE commerce_products SET stock=stock+$2, updated_at=now() WHERE id=$1",
          [reservation.product_id, reservation.quantity],
        );
        await client.query(
          "UPDATE inventory_reservations SET status='expired', updated_at=now() WHERE id=$1",
          [reservation.id],
        );
      }
      await client.query("COMMIT");
      return expired.rowCount ?? 0;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async consumeReservations(orderId: string): Promise<void> {
    await pool.query(
      `UPDATE inventory_reservations SET status='consumed',updated_at=now()
       WHERE order_id=$1 AND status='active'`,
      [orderId],
    );
  }
}

export const commerceRepository = new CommerceRepository();
