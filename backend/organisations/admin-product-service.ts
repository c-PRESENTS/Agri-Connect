import type {
  AdminAccessContext,
  AdminPermissionCode,
  ProductModerationStatus,
} from "@shared/schema";
import { productCompatibilityPublicationStatus, sellerPublicEligibilitySql } from "../catalog/product-visibility";
import { pool } from "../config/db";
import { getAdminProductDetail } from "./admin-product-repository";
import { isProductModerationTransitionAllowed } from "./admin-product-validation";

export class ProductModerationError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export interface ProductModerationActor {
  userId: string;
  access?: AdminAccessContext;
  requestId?: string | null;
}

type LockedProduct = {
  id: string;
  name: string;
  price_minor: string;
  unit: string;
  stock: number;
  category_id: string;
  subcategory_id: string;
  farmer_id: string;
  region_id: string | null;
  product_data: Record<string, unknown>;
  moderation_status: ProductModerationStatus;
  updated_at: Date;
  seller_is_eligible: boolean;
  region_is_eligible: boolean;
};

function sameInstant(actual: Date, expected: string): boolean {
  return actual.getTime() === new Date(expected).getTime();
}

function isValidImageReference(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 2_000_000) return false;
  if (/^data:image\/(jpeg|png|webp);base64,/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validateApproval(product: LockedProduct, validCategory: boolean): void {
  const images = product.product_data.images;
  if (!product.seller_is_eligible) {
    throw new ProductModerationError(422, "PRODUCT_SELLER_INELIGIBLE", "The seller must have an active, verified account before approval.");
  }
  if (!product.region_id || !product.region_is_eligible) {
    throw new ProductModerationError(422, "PRODUCT_REGION_INELIGIBLE", "The product must use an active approved selling region before approval.");
  }
  if (!validCategory) {
    throw new ProductModerationError(422, "PRODUCT_CATEGORY_INVALID", "The product category and subcategory are not in the current published catalogue.");
  }
  if (Number(product.price_minor) <= 0 || !Number.isSafeInteger(Number(product.price_minor))) {
    throw new ProductModerationError(422, "PRODUCT_PRICE_INVALID", "The product price must be greater than zero.");
  }
  if (!Number.isInteger(product.stock) || product.stock < 0) {
    throw new ProductModerationError(422, "PRODUCT_STOCK_INVALID", "The product stock must be a non-negative whole number.");
  }
  if (!product.unit.trim() || product.unit.length > 40) {
    throw new ProductModerationError(422, "PRODUCT_UNIT_INVALID", "The product unit is invalid.");
  }
  if (!Array.isArray(images) || images.length < 1 || images.length > 10 || !images.every(isValidImageReference)) {
    throw new ProductModerationError(422, "PRODUCT_IMAGES_INVALID", "The product needs one to ten valid product images.");
  }
}

async function insertAudit(
  client: any,
  actor: ProductModerationActor,
  action: string,
  permission: AdminPermissionCode | null,
  productId: string,
  changes: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `INSERT INTO admin_audit_events
       (organisation_id,actor_user_id,membership_id,action,permission_code,target_type,target_id,outcome,request_id,changes,metadata)
     VALUES ($1,$2,$3,$4,$5,'product',$6,'success',$7,$8::jsonb,'{}'::jsonb)`,
    [
      actor.access?.organisation?.id ?? null,
      actor.userId,
      actor.access?.membership?.id ?? null,
      action,
      permission,
      productId,
      actor.requestId ?? null,
      JSON.stringify(changes),
    ],
  );
}

async function lockProduct(client: any, productId: string): Promise<LockedProduct> {
  const result = await client.query(
    `SELECT p.*,
            (${sellerPublicEligibilitySql("u")}) AS seller_is_eligible,
            EXISTS (
              SELECT 1 FROM seller_region_assignments sra
              JOIN market_regions region ON region.id=sra.region_id AND region.active=true
              WHERE sra.seller_id=p.farmer_id AND sra.region_id=p.region_id
                AND sra.status='active' AND sra.can_publish=true
                AND (sra.effective_at IS NULL OR sra.effective_at<=now())
                AND (sra.expires_at IS NULL OR sra.expires_at>now())
            ) AS region_is_eligible
       FROM commerce_products p
       JOIN users u ON u.id=p.farmer_id
      WHERE p.id=$1
      FOR UPDATE OF p`,
    [productId],
  );
  if (!result.rows[0]) throw new ProductModerationError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  return result.rows[0] as LockedProduct;
}

export async function submitSellerProduct(
  productId: string,
  sellerId: string,
  expectedUpdatedAt: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const product = await lockProduct(client, productId);
    if (product.farmer_id !== sellerId) throw new ProductModerationError(403, "PRODUCT_OWNER_REQUIRED", "Access denied.");
    if (!sameInstant(product.updated_at, expectedUpdatedAt)) throw new ProductModerationError(409, "PRODUCT_STALE_UPDATE", "The listing changed. Refresh before submitting it.");
    if (!isProductModerationTransitionAllowed(product.moderation_status, "pending_review")) {
      throw new ProductModerationError(422, "PRODUCT_TRANSITION_INVALID", `A ${product.moderation_status} listing cannot be submitted for review.`);
    }
    const now = new Date();
    await client.query(
      `UPDATE commerce_products
          SET moderation_status='pending_review',submitted_at=$2,reviewed_at=NULL,reviewed_by=NULL,
              moderation_reason=NULL,moderation_version=moderation_version+1,
              product_data=jsonb_set(jsonb_set(product_data,'{moderationStatus}','"pending_review"'::jsonb,true),'{publicationStatus}','"draft"'::jsonb,true),
              updated_at=$2
        WHERE id=$1`,
      [productId, now],
    );
    await client.query(
      `INSERT INTO product_moderation_events (product_id,actor_id,event_type,from_status,to_status)
       VALUES ($1,$2,'submitted',$3,'pending_review')`,
      [productId, sellerId, product.moderation_status],
    );
    await insertAudit(client, { userId: sellerId }, "seller.product_submitted", null, productId, { from: product.moderation_status, to: "pending_review" });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function moderateProduct(
  productId: string,
  actor: ProductModerationActor,
  input: {
    toStatus: ProductModerationStatus;
    expectedUpdatedAt: string;
    reason?: string;
    permission: AdminPermissionCode;
    action: string;
    validCategory: boolean;
  },
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const product = await lockProduct(client, productId);
    if (!sameInstant(product.updated_at, input.expectedUpdatedAt)) throw new ProductModerationError(409, "PRODUCT_STALE_UPDATE", "The listing changed. Refresh before reviewing it.");
    if (!isProductModerationTransitionAllowed(product.moderation_status, input.toStatus)) {
      throw new ProductModerationError(422, "PRODUCT_TRANSITION_INVALID", `The transition from ${product.moderation_status} to ${input.toStatus} is not allowed.`);
    }
    if (input.toStatus === "approved") validateApproval(product, input.validCategory);
    const publicationStatus = productCompatibilityPublicationStatus(input.toStatus);
    const reason = input.reason?.trim() || null;
    const now = new Date();
    await client.query(
      `UPDATE commerce_products
          SET moderation_status=$2::varchar,reviewed_at=$3,reviewed_by=$4,moderation_reason=$5,
              moderation_version=moderation_version+1,
              is_featured=CASE WHEN $2::varchar='approved' THEN is_featured ELSE false END,
              is_fresh_pick=CASE WHEN $2::varchar='approved' THEN is_fresh_pick ELSE false END,
              product_data=jsonb_strip_nulls(
                jsonb_set(
                  jsonb_set(
                    jsonb_set(product_data,'{moderationStatus}',to_jsonb($2::text),true),
                    '{publicationStatus}',to_jsonb($6::text),true
                  ),
                  '{publicationReason}',COALESCE(to_jsonb($5::text),'null'::jsonb),true
                )
              ),
              updated_at=$3
        WHERE id=$1`,
      [productId, input.toStatus, now, actor.userId, reason, publicationStatus],
    );
    await client.query(
      `INSERT INTO product_moderation_events
         (product_id,actor_id,event_type,from_status,to_status,reason,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,'{}'::jsonb)`,
      [productId, actor.userId, input.action, product.moderation_status, input.toStatus, reason],
    );
    await insertAudit(client, actor, `admin.product_${input.action}`, input.permission, productId, {
      from: product.moderation_status,
      to: input.toStatus,
      reason,
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function setProductPromotion(
  productId: string,
  actor: ProductModerationActor,
  input: { field: "is_featured" | "is_fresh_pick"; enabled: boolean; expectedUpdatedAt: string },
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const product = await lockProduct(client, productId);
    if (!sameInstant(product.updated_at, input.expectedUpdatedAt)) throw new ProductModerationError(409, "PRODUCT_STALE_UPDATE", "The listing changed. Refresh before updating promotion placement.");
    if (product.moderation_status !== "approved") throw new ProductModerationError(422, "PRODUCT_NOT_APPROVED", "Only approved products can be featured or marked as Fresh Picks.");
    const now = new Date();
    const jsonField = input.field === "is_featured" ? "isFeatured" : "isFreshPick";
    await client.query(
      `UPDATE commerce_products
          SET ${input.field}=$2,moderation_version=moderation_version+1,
              product_data=jsonb_set(product_data,$3::text[],to_jsonb($2::boolean),true),updated_at=$4
        WHERE id=$1`,
      [productId, input.enabled, [jsonField], now],
    );
    const eventType = input.field === "is_featured" ? "feature_updated" : "fresh_pick_updated";
    await client.query(
      `INSERT INTO product_moderation_events (product_id,actor_id,event_type,from_status,to_status,metadata)
       VALUES ($1,$2,$3,'approved','approved',jsonb_build_object('enabled',$4::boolean))`,
      [productId, actor.userId, eventType, input.enabled],
    );
    await insertAudit(client, actor, `admin.product_${eventType}`, "products.feature", productId, { enabled: input.enabled });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getUpdatedAdminProduct(productId: string) {
  return getAdminProductDetail(productId);
}
