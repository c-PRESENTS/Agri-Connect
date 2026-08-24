import type {
  AdminProductDetailResponse,
  AdminProductListItem,
  AdminProductsResponse,
  ProductModerationStatus,
} from "@shared/schema";
import { sellerPublicEligibilitySql } from "../catalog/product-visibility";
import { pool } from "../config/db";
import type { AdminProductQuery } from "./admin-product-validation";

function iso(value: unknown): string | null {
  return value ? new Date(value as string | number | Date).toISOString() : null;
}

function mapProduct(row: Record<string, any>): AdminProductListItem {
  return {
    id: row.id,
    name: row.name,
    image: row.image ?? null,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    price: Number(row.price_minor) / 100,
    currency: row.currency,
    unit: row.unit,
    stock: Number(row.stock),
    moderationStatus: row.moderation_status as ProductModerationStatus,
    moderationReason: row.moderation_reason ?? null,
    isFeatured: row.is_featured === true,
    isFreshPick: row.is_fresh_pick === true,
    regionId: row.region_id ?? null,
    regionName: row.region_name ?? null,
    submittedAt: iso(row.submitted_at),
    reviewedAt: iso(row.reviewed_at),
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
    moderationVersion: Number(row.moderation_version),
    seller: {
      id: row.farmer_id,
      name: row.seller_name,
      avatar: row.seller_avatar ?? null,
      location: row.seller_location ?? null,
      accountStatus: row.seller_account_status,
      verificationStatus: row.seller_verification_status,
      isEligible: row.seller_is_eligible === true,
    },
  };
}

const SELECT_PRODUCT = `
  p.*,
  p.product_data->'images'->>0 AS image,
  COALESCE(NULLIF(u.name,''),NULLIF(concat_ws(' ',u.first_name,u.last_name),''),u.email,u.id) AS seller_name,
  COALESCE(u.avatar,u.profile_image_url) AS seller_avatar,
  u.location AS seller_location,
  u.account_status AS seller_account_status,
  CASE WHEN u.auth_method='catalog_seed' AND u.is_verified=true THEN 'verified'
       ELSE COALESCE(verification.status,'not_started') END AS seller_verification_status,
  (${sellerPublicEligibilitySql("u")}) AS seller_is_eligible,
  region.name AS region_name`;

const PRODUCT_JOINS = `
  JOIN users u ON u.id=p.farmer_id
  LEFT JOIN market_regions region ON region.id=p.region_id
  LEFT JOIN LATERAL (
    SELECT status,expires_at
      FROM seller_verification_cases
     WHERE seller_id=u.id
     ORDER BY updated_at DESC
     LIMIT 1
  ) verification ON true`;

export async function listAdminProducts(input: AdminProductQuery): Promise<AdminProductsResponse> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (input.search) {
    params.push(`%${input.search}%`);
    const token = `$${params.length}`;
    where.push(`(p.name ILIKE ${token} OR p.description ILIKE ${token} OR u.email ILIKE ${token} OR COALESCE(u.name,concat_ws(' ',u.first_name,u.last_name)) ILIKE ${token})`);
  }
  if (input.status) add("p.moderation_status=?", input.status);
  if (input.categoryId) add("p.category_id=?", input.categoryId);
  if (input.sellerId) add("p.farmer_id=?", input.sellerId);
  if (input.regionId) add("p.region_id=?", input.regionId);
  if (input.featured !== undefined) add("p.is_featured=?", input.featured);
  if (input.freshPick !== undefined) add("p.is_fresh_pick=?", input.freshPick);
  const sortColumns = {
    updatedAt: "p.updated_at",
    createdAt: "p.created_at",
    name: "p.name",
    price: "p.price_minor",
    stock: "p.stock",
    status: "p.moderation_status",
  } as const;
  params.push(input.pageSize, (input.page - 1) * input.pageSize);
  const limit = `$${params.length - 1}`;
  const offset = `$${params.length}`;
  const result = await pool.query(
    `SELECT ${SELECT_PRODUCT},count(*) OVER()::int AS total_count
       FROM commerce_products p
       ${PRODUCT_JOINS}
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY ${sortColumns[input.sort]} ${input.direction.toUpperCase()},p.id
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const total = Number(result.rows[0]?.total_count ?? 0);
  return {
    products: result.rows.map(mapProduct),
    pagination: { page: input.page, pageSize: input.pageSize, total, pageCount: Math.ceil(total / input.pageSize) },
    generatedAt: new Date().toISOString(),
  };
}

export async function getAdminProductDetail(productId: string): Promise<AdminProductDetailResponse | null> {
  const [productResult, historyResult] = await Promise.all([
    pool.query(
      `SELECT ${SELECT_PRODUCT}
         FROM commerce_products p
         ${PRODUCT_JOINS}
        WHERE p.id=$1`,
      [productId],
    ),
    pool.query(
      `SELECT e.id,e.event_type,e.from_status,e.to_status,e.reason,e.actor_id,e.metadata,e.created_at,
              COALESCE(NULLIF(u.name,''),NULLIF(concat_ws(' ',u.first_name,u.last_name),''),u.email,'System') AS actor_name
         FROM product_moderation_events e
         LEFT JOIN users u ON u.id=e.actor_id
        WHERE e.product_id=$1
        ORDER BY e.created_at DESC,e.id DESC`,
      [productId],
    ),
  ]);
  const row = productResult.rows[0];
  if (!row) return null;
  const data = row.product_data ?? {};
  return {
    product: {
      ...mapProduct(row),
      description: row.description,
      images: Array.isArray(data.images) ? data.images.filter((item: unknown): item is string => typeof item === "string") : [],
      isOrganic: data.isOrganic === true,
      rating: Number(data.rating ?? 0),
      reviewCount: Number(data.reviewCount ?? 0),
    },
    moderationHistory: historyResult.rows.map((event: Record<string, any>) => ({
      id: event.id,
      eventType: event.event_type,
      fromStatus: event.from_status ?? null,
      toStatus: event.to_status ?? null,
      reason: event.reason ?? null,
      actorId: event.actor_id ?? null,
      actorName: event.actor_name,
      metadata: event.metadata ?? {},
      createdAt: iso(event.created_at)!,
    })),
    generatedAt: new Date().toISOString(),
  };
}
