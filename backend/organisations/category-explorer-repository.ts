import { pool } from "../config/db";

export type CategoryExplorerFilter = {
  category?: string;
  subCategory?: string;
  variety?: string;
  region?: string;
  search?: string;
  scope?: "local" | "global";
  sortBy?: "relevance" | "price_asc" | "price_desc" | "rating";
  minPrice?: number;
  maxPrice?: number;
  quantity?: "any" | "bulk" | "retail";
  quality?: "all" | "organic" | "premium";
};

type Row = Record<string, any>;

function numeric(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function object(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function percentageDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current <= 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1_000) / 10;
}

function distanceKm(latitudeA: unknown, longitudeA: unknown, latitudeB: unknown, longitudeB: unknown): number | null {
  const values = [latitudeA, longitudeA, latitudeB, longitudeB].map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;
  const [latA, lonA, latB, lonB] = values;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(latB - latA);
  const dLon = toRadians(lonB - lonA);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6_371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

const visibleSellerSql = `
  u.account_status='active'
  AND p.moderation_status='approved'
  AND EXISTS (
    SELECT 1 FROM seller_verification_cases verified_case
    WHERE verified_case.seller_id=u.id
      AND verified_case.status='verified'
      AND (verified_case.expires_at IS NULL OR verified_case.expires_at>now())
  )`;

async function resolveRegion(region: string | undefined) {
  if (!region) {
    const result = await pool.query(
      `SELECT r.id,r.name,r.type,r.country_code,r.latitude,r.longitude
         FROM market_regions r
        WHERE r.active=true
        ORDER BY (SELECT count(*) FROM seller_region_assignments sra WHERE sra.region_id=r.id AND sra.status='active') DESC,
                 r.name
        LIMIT 1`,
    );
    return result.rows[0] ?? null;
  }
  const result = await pool.query(
    `SELECT id,name,type,country_code,latitude,longitude
       FROM market_regions
      WHERE active=true AND (id=$1 OR lower(name)=lower($1))
      LIMIT 1`,
    [region],
  );
  return result.rows[0] ?? null;
}

export async function setCategoryExplorerSavedProduct(userId: string, productId: string, saved: boolean) {
  const product = await pool.query(
    `SELECT p.id FROM commerce_products p JOIN users u ON u.id=p.farmer_id
      WHERE p.id=$1 AND ${visibleSellerSql}`,
    [productId],
  );
  if (!product.rowCount) throw new Error("CONTROL_CENTRE_RESOURCE_NOT_FOUND");
  if (saved) {
    await pool.query(
      `INSERT INTO commerce_saved_products(user_id,product_id)
       VALUES ($1,$2) ON CONFLICT (user_id,product_id) DO NOTHING`,
      [userId, productId],
    );
  } else {
    await pool.query("DELETE FROM commerce_saved_products WHERE user_id=$1 AND product_id=$2", [userId, productId]);
  }
  return { productId, saved };
}

export async function acceptMarketplaceOpportunity(id: string, userId: string, ttlMinutes: number) {
  const result = await pool.query(
    `UPDATE regional_product_opportunities opportunity
        SET status='claimed',claimed_by=$2,
            claim_expires_at=now()+($3::text || ' minutes')::interval,
            updated_at=now()
      WHERE opportunity.id=$1
        AND (opportunity.status='open' OR (
          opportunity.status IN ('claimed','listing_submitted')
          AND opportunity.claim_expires_at<=now()
        ))
        AND EXISTS (
          SELECT 1 FROM seller_region_assignments assignment
          WHERE assignment.seller_id=$2
            AND assignment.region_id=opportunity.region_id
            AND assignment.status='active'
            AND assignment.can_publish=true
            AND (assignment.effective_at IS NULL OR assignment.effective_at<=now())
            AND (assignment.expires_at IS NULL OR assignment.expires_at>now())
        )
      RETURNING id,product_name AS "productName",status,
                claimed_by AS "claimedBy",claim_expires_at AS "claimExpiresAt"`,
    [id, userId, ttlMinutes],
  );
  if (result.rows[0]) return result.rows[0];
  const exists = await pool.query("SELECT 1 FROM regional_product_opportunities WHERE id=$1", [id]);
  if (!exists.rowCount) throw new Error("CONTROL_CENTRE_RESOURCE_NOT_FOUND");
  throw new Error("MARKETPLACE_OPPORTUNITY_NOT_CLAIMABLE");
}

export async function getCategoryExplorerData(filters: CategoryExplorerFilter, userId: string) {
  const selectedRegion = await resolveRegion(filters.region);
  const regionId = selectedRegion?.id ? String(selectedRegion.id) : null;
  const scope = filters.scope === "global" ? "global" : "local";

  const [taxonomyResult, regionsResult] = await Promise.all([
    pool.query(
      `SELECT c.id,c.canonical_id,c.parent_id,
              COALESCE(NULLIF(c.published_data->>'name',''),c.name) AS name,
              COALESCE(NULLIF(c.published_data->>'icon',''),c.icon,'Leaf') AS icon,
              COALESCE((c.published_data->>'displayOrder')::int,c.display_order) AS display_order,
              count(DISTINCT p.id)::int AS product_count
         FROM catalog_categories c
         LEFT JOIN commerce_products p
           ON p.moderation_status='approved'
          AND (p.category_id=c.canonical_id OR p.subcategory_id=c.canonical_id)
        WHERE c.published_data IS NOT NULL AND c.archived_at IS NULL
        GROUP BY c.id
        ORDER BY c.parent_id NULLS FIRST,display_order,c.name`,
    ),
    pool.query(
      `SELECT id,name,type,country_code AS "countryCode",latitude,longitude
         FROM market_regions WHERE active=true ORDER BY country_code,name`,
    ),
  ]);

  const taxonomyRows = taxonomyResult.rows as Row[];
  const rootById = new Map<string, any>();
  for (const row of taxonomyRows.filter((item) => !item.parent_id)) {
    rootById.set(String(row.id), {
      id: String(row.canonical_id),
      name: String(row.name),
      icon: String(row.icon),
      count: numeric(row.product_count),
      subcategories: [],
    });
  }
  for (const row of taxonomyRows.filter((item) => item.parent_id)) {
    const parent = rootById.get(String(row.parent_id));
    if (!parent) continue;
    parent.subcategories.push({
      id: String(row.canonical_id),
      name: String(row.name),
      count: numeric(row.product_count),
      items: [],
    });
  }
  const categoriesNav = Array.from(rootById.values());

  const values: unknown[] = [userId];
  const conditions = [visibleSellerSql];
  const add = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (filters.category) conditions.push(`p.category_id=${add(filters.category)}`);
  if (filters.subCategory) conditions.push(`p.subcategory_id=${add(filters.subCategory)}`);
  if (filters.search?.trim()) {
    const parameter = add(`%${filters.search.trim()}%`);
    conditions.push(`(p.name ILIKE ${parameter} OR p.description ILIKE ${parameter}
      OR COALESCE(p.product_data->>'variety','') ILIKE ${parameter}
      OR COALESCE(u.name,concat_ws(' ',u.first_name,u.last_name),'') ILIKE ${parameter}
      OR COALESCE(u.email,'') ILIKE ${parameter}
      OR p.category_id ILIKE ${parameter}
      OR p.subcategory_id ILIKE ${parameter}
      OR EXISTS (
        SELECT 1
          FROM catalog_categories search_category
         WHERE search_category.archived_at IS NULL
           AND search_category.published_data IS NOT NULL
           AND search_category.canonical_id=p.category_id
           AND COALESCE(NULLIF(search_category.published_data->>'name',''),search_category.name) ILIKE ${parameter}
      )
      OR EXISTS (
        SELECT 1
          FROM catalog_categories search_subcategory
         WHERE search_subcategory.archived_at IS NULL
           AND search_subcategory.published_data IS NOT NULL
           AND search_subcategory.canonical_id=p.subcategory_id
           AND COALESCE(NULLIF(search_subcategory.published_data->>'name',''),search_subcategory.name) ILIKE ${parameter}
      ))`);
  }
  if (scope === "local" && regionId) conditions.push(`p.region_id=${add(regionId)}`);

  const productsResult = await pool.query(
    `SELECT p.id,p.name,p.description,p.price_minor,p.currency,p.unit,p.stock,
            p.category_id,p.subcategory_id,p.region_id,p.product_data,
            p.is_featured,p.is_fresh_pick,p.created_at,
            u.id AS seller_id,
            COALESCE(NULLIF(u.name,''),NULLIF(concat_ws(' ',u.first_name,u.last_name),''),u.email,'Unnamed seller') AS seller_name,
            COALESCE(u.avatar,u.profile_image_url) AS seller_avatar,
            u.location AS seller_location,u.latitude AS seller_latitude,u.longitude AS seller_longitude,
            COALESCE(u.rating,0) AS seller_rating,u.is_online,
            true AS seller_verified,
            r.name AS region_name,r.latitude AS region_latitude,r.longitude AS region_longitude,
            seller_org.organisation_name,
            EXISTS (SELECT 1 FROM commerce_saved_products saved WHERE saved.user_id=$1 AND saved.product_id=p.id) AS saved
       FROM commerce_products p
       JOIN users u ON u.id=p.farmer_id
       LEFT JOIN market_regions r ON r.id=p.region_id
       LEFT JOIN LATERAL (
         SELECT organisation.name AS organisation_name
           FROM seller_region_assignments assignment
           JOIN organisations organisation ON organisation.id=assignment.organisation_id
          WHERE assignment.seller_id=p.farmer_id
            AND assignment.status='active'
            AND (p.region_id IS NULL OR assignment.region_id=p.region_id)
          ORDER BY assignment.updated_at DESC
          LIMIT 1
       ) seller_org ON true
      WHERE ${conditions.join(" AND ")}
      ORDER BY p.created_at DESC,p.id`,
    values,
  );

  let allProducts = (productsResult.rows as Row[]).map((row) => {
    const data = object(row.product_data);
    const images = Array.isArray(data.images)
      ? data.images.flatMap((value) => typeof value === "string" && value.trim() ? [value.trim()] : [])
      : [];
    const organic = data.isOrganic === true;
    const qualityGrade = text(data.qualityGrade);
    const badgeType = row.is_fresh_pick ? "fresh"
      : organic ? "organic"
      : row.is_featured || qualityGrade === "A" ? "premium"
      : undefined;
    const badge = row.is_fresh_pick ? "Fresh Pick"
      : organic ? "Organic"
      : row.is_featured ? "Featured"
      : qualityGrade === "A" ? "Premium"
      : undefined;
    const storedDistance = Number(data.distance);
    const computedDistance = distanceKm(
      selectedRegion?.latitude,
      selectedRegion?.longitude,
      row.seller_latitude,
      row.seller_longitude,
    );
    return {
      id: String(row.id),
      title: String(row.name),
      variety: text(data.variety) ?? String(row.name),
      category: String(row.category_id),
      subCategory: String(row.subcategory_id),
      badge,
      badgeType,
      imageUrl: images[0] ?? null,
      images,
      sellerName: String(row.seller_name),
      sellerVerified: row.seller_verified === true,
      sellerAvatar: text(row.seller_avatar),
      location: text(row.region_name) ?? text(row.seller_location),
      distanceKm: Number.isFinite(storedDistance) ? storedDistance : computedDistance,
      rating: numeric(data.rating ?? row.seller_rating),
      reviewCount: numeric(data.reviewCount),
      inStock: numeric(row.stock) > 0,
      stockKg: numeric(row.stock),
      pricePerKg: numeric(row.price_minor) / 100,
      minOrderKg: Math.max(1, numeric(data.minOrderKg ?? data.minOrder ?? 1)),
      currency: String(row.currency),
      unit: String(row.unit),
      organisationName: text(row.organisation_name),
      isSaved: row.saved === true,
      isOrganic: organic,
      qualityGrade,
      sellerId: String(row.seller_id),
      searchRank: 0,
    };
  });

  const normalizedSearch = filters.search?.trim().toLocaleLowerCase();
  if (normalizedSearch) {
    const taxonomyNamesByCanonicalId = new Map(
      taxonomyRows.map((row) => [
        String(row.canonical_id),
        String(row.name).toLocaleLowerCase(),
      ]),
    );
    for (const product of allProducts) {
      const name = product.title.toLocaleLowerCase();
      const variety = product.variety.toLocaleLowerCase();
      const seller = product.sellerName.toLocaleLowerCase();
      const category = taxonomyNamesByCanonicalId.get(product.category) ?? "";
      const subCategory = taxonomyNamesByCanonicalId.get(product.subCategory) ?? "";
      product.searchRank = name === normalizedSearch ? 0
        : name.startsWith(normalizedSearch) ? 1
        : name.includes(normalizedSearch) ? 2
        : variety.includes(normalizedSearch) ? 3
        : subCategory.includes(normalizedSearch) ? 4
        : category.includes(normalizedSearch) ? 5
        : seller.includes(normalizedSearch) ? 6
        : 7;
    }
  }

  const varietyCounts = new Map<string, number>();
  for (const product of allProducts) varietyCounts.set(product.variety, (varietyCounts.get(product.variety) ?? 0) + 1);
  const varieties = Array.from(varietyCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));

  if (filters.variety?.trim()) allProducts = allProducts.filter((product) => product.variety === filters.variety);
  if (filters.minPrice !== undefined) allProducts = allProducts.filter((product) => product.pricePerKg >= filters.minPrice!);
  if (filters.maxPrice !== undefined) allProducts = allProducts.filter((product) => product.pricePerKg <= filters.maxPrice!);
  if (filters.quantity === "bulk") allProducts = allProducts.filter((product) => product.stockKg >= 50);
  if (filters.quantity === "retail") allProducts = allProducts.filter((product) => product.minOrderKg <= 10);
  if (filters.quality === "organic") allProducts = allProducts.filter((product) => product.isOrganic);
  if (filters.quality === "premium") allProducts = allProducts.filter((product) => product.qualityGrade === "A" || product.badgeType === "premium");
  if (filters.sortBy === "price_asc") allProducts.sort((a, b) => a.pricePerKg - b.pricePerKg);
  else if (filters.sortBy === "price_desc") allProducts.sort((a, b) => b.pricePerKg - a.pricePerKg);
  else if (filters.sortBy === "rating") allProducts.sort((a, b) => b.rating - a.rating);
  else allProducts.sort((a, b) => a.searchRank - b.searchRank
    || Number(Boolean(b.badge)) - Number(Boolean(a.badge))
    || b.rating - a.rating);

  const filteredProductCount = allProducts.length;
  const approvedSellerIds = new Set(allProducts.map((product) => product.sellerId));
  const coveredLocations = new Set(allProducts.map((product) => product.location).filter(Boolean));

  const regionParameter = regionId ? [regionId] : [];
  const regionClause = regionId ? "AND assignment.region_id=$1" : "";
  const [organisationsResult, farmersResult, managersResult, liveSellersResult, mapResult, opportunityResult, statusResult, districtResult] = await Promise.all([
    pool.query(
      `SELECT organisation.id,organisation.name,organisation.type,
              string_agg(DISTINCT region.name,', ' ORDER BY region.name) AS location,
              count(DISTINCT product.id)::int AS product_count
         FROM organisations organisation
         LEFT JOIN organisation_region_assignments organisation_region
           ON organisation_region.organisation_id=organisation.id AND organisation_region.status='active'
         LEFT JOIN market_regions region ON region.id=organisation_region.region_id
         LEFT JOIN seller_region_assignments assignment
           ON assignment.organisation_id=organisation.id AND assignment.status='active'
         LEFT JOIN commerce_products product
           ON product.farmer_id=assignment.seller_id AND product.moderation_status='approved'
        WHERE organisation.status='approved' ${regionId ? "AND organisation_region.region_id=$1" : ""}
        GROUP BY organisation.id ORDER BY product_count DESC,organisation.name LIMIT 5`,
      regionParameter,
    ),
    pool.query(
      `SELECT u.id,COALESCE(NULLIF(u.name,''),NULLIF(concat_ws(' ',u.first_name,u.last_name),''),u.email) AS name,
              COALESCE(u.avatar,u.profile_image_url) AS avatar,u.location,
              count(DISTINCT product.id)::int AS product_count,COALESCE(sum(product.stock),0)::int AS total_stock
         FROM users u
         JOIN commerce_products product ON product.farmer_id=u.id AND product.moderation_status='approved'
         LEFT JOIN seller_region_assignments assignment ON assignment.seller_id=u.id AND assignment.status='active'
        WHERE u.account_status='active' AND (u.role='farmer' OR u.seller_enabled=true)
          AND EXISTS (
            SELECT 1 FROM seller_verification_cases verification
            WHERE verification.seller_id=u.id AND verification.status='verified'
              AND (verification.expires_at IS NULL OR verification.expires_at>now())
          ) ${regionClause}
        GROUP BY u.id ORDER BY total_stock DESC,product_count DESC,u.rating DESC LIMIT 5`,
      regionParameter,
    ),
    pool.query(
      `SELECT membership.id,COALESCE(NULLIF(u.name,''),NULLIF(concat_ws(' ',u.first_name,u.last_name),''),u.email) AS name,
              COALESCE(u.avatar,u.profile_image_url) AS avatar,role.name AS role,
              string_agg(DISTINCT region.name,', ' ORDER BY region.name) AS location
         FROM organisation_memberships membership
         JOIN users u ON u.id=membership.user_id
         JOIN admin_roles role ON role.id=membership.role_id
         LEFT JOIN organisation_region_assignments organisation_region ON organisation_region.organisation_id=membership.organisation_id AND organisation_region.status='active'
         LEFT JOIN market_regions region ON region.id=organisation_region.region_id
        WHERE membership.status='active'
          AND (lower(role.name) LIKE '%manager%' OR lower(role.code) LIKE '%manager%' OR lower(role.name) LIKE '%regional%')
          ${regionId ? "AND organisation_region.region_id=$1" : ""}
        GROUP BY membership.id,u.id,role.id ORDER BY name LIMIT 5`,
      regionParameter,
    ),
    pool.query(
      `SELECT u.id,COALESCE(NULLIF(u.name,''),NULLIF(concat_ws(' ',u.first_name,u.last_name),''),u.email) AS name,
              COALESCE(u.avatar,u.profile_image_url) AS avatar,COALESCE(u.rating,0) AS rating,
              u.latitude,u.longitude,
              count(DISTINCT p.id) FILTER (WHERE p.moderation_status='approved')::int AS product_count,
              EXISTS (
                SELECT 1 FROM seller_verification_cases verified_case
                WHERE verified_case.seller_id=u.id AND verified_case.status='verified'
                  AND (verified_case.expires_at IS NULL OR verified_case.expires_at>now())
              ) AS seller_verified,
              active_session.expires_at AS session_expires_at
         FROM users u
         JOIN LATERAL (
           SELECT max(session.expire) AS expires_at
           FROM sessions session
           WHERE session.sess->>'userId'=u.id AND session.expire>now()
         ) active_session ON active_session.expires_at IS NOT NULL
         LEFT JOIN commerce_products p ON p.farmer_id=u.id
         LEFT JOIN seller_region_assignments assignment ON assignment.seller_id=u.id AND assignment.status='active'
        WHERE u.account_status='active'
          AND u.auth_method IS DISTINCT FROM 'catalog_seed'
          AND (u.role='farmer' OR u.seller_enabled=true)
          ${regionId ? "AND (p.region_id=$1 OR assignment.region_id=$1)" : ""}
        GROUP BY u.id,active_session.expires_at
        ORDER BY active_session.expires_at DESC,u.rating DESC,product_count DESC LIMIT 8`,
      regionParameter,
    ),
    pool.query(
      `SELECT region.id,region.name,region.type,region.latitude,region.longitude,
              count(DISTINCT assignment.seller_id)::int AS seller_count,
              count(DISTINCT assignment.organisation_id)::int AS organisation_count,
              count(DISTINCT assignment.seller_id) FILTER (WHERE product_totals.total_stock>=1000)::int AS large_farmer_count
         FROM market_regions region
         LEFT JOIN seller_region_assignments assignment ON assignment.region_id=region.id AND assignment.status='active'
         LEFT JOIN LATERAL (
           SELECT COALESCE(sum(product.stock),0) AS total_stock
             FROM commerce_products product
            WHERE product.farmer_id=assignment.seller_id AND product.moderation_status='approved'
         ) product_totals ON true
        WHERE region.active=true ${regionId ? "AND (region.id=$1 OR region.parent_id=$1)" : ""}
        GROUP BY region.id ORDER BY seller_count DESC,region.name LIMIT 12`,
      regionParameter,
    ),
    pool.query(
      `SELECT opportunity.id,opportunity.product_name,opportunity.status,opportunity.claimed_by,
              opportunity.claim_expires_at,region.id AS region_id,region.name AS region_name,
              target.minimum_active_listings,
              (SELECT count(*)::int FROM commerce_products product
                WHERE product.region_id=opportunity.region_id AND product.moderation_status='approved'
                  AND lower(regexp_replace(product.name,'[^a-z0-9]+','','g'))=opportunity.product_key) AS active_listings,
              (SELECT count(*)::int FROM seller_region_assignments eligible
                WHERE eligible.region_id=opportunity.region_id AND eligible.status='active' AND eligible.can_publish=true) AS eligible_sellers,
              EXISTS (SELECT 1 FROM seller_region_assignments own_assignment
                WHERE own_assignment.region_id=opportunity.region_id AND own_assignment.seller_id=$1
                  AND own_assignment.status='active' AND own_assignment.can_publish=true) AS claimable,
              (SELECT product.product_data->'images'->>0 FROM commerce_products product
                WHERE product.region_id=opportunity.region_id AND product.moderation_status='approved'
                  AND lower(product.name)=lower(opportunity.product_name) LIMIT 1) AS image_url
         FROM regional_product_opportunities opportunity
         JOIN regional_catalog_targets target ON target.id=opportunity.target_id
         JOIN market_regions region ON region.id=opportunity.region_id
        WHERE opportunity.status='open' OR opportunity.claimed_by=$1
          ${regionId ? "AND opportunity.region_id=$2" : ""}
        ORDER BY CASE WHEN opportunity.claimed_by=$1 THEN 0 ELSE 1 END,opportunity.created_at DESC LIMIT 1`,
      regionId ? [userId, regionId] : [userId],
    ),
    pool.query(
      `SELECT
          count(DISTINCT p.farmer_id)::int AS active_sellers,
          count(DISTINCT p.farmer_id) FILTER (WHERE p.created_at<now()-interval '30 days')::int AS previous_sellers,
          count(DISTINCT p.id)::int AS products_listed,
          count(DISTINCT p.id) FILTER (WHERE p.created_at<now()-interval '30 days')::int AS previous_products,
          count(DISTINCT orders.id) FILTER (WHERE orders.created_at>=now()-interval '30 days')::int AS orders_30_days,
          count(DISTINCT orders.id) FILTER (WHERE orders.created_at>=now()-interval '60 days' AND orders.created_at<now()-interval '30 days')::int AS previous_orders,
          avg(EXTRACT(epoch FROM delivered.occurred_at-orders.created_at)/86400.0) FILTER (WHERE delivered.occurred_at IS NOT NULL) AS avg_delivery_days
        FROM commerce_products p
        JOIN users u ON u.id=p.farmer_id
        LEFT JOIN commerce_order_items item ON item.product_id=p.id
        LEFT JOIN commerce_orders orders ON orders.id=item.order_id
        LEFT JOIN commerce_order_status_history delivered ON delivered.order_id=orders.id AND delivered.status='delivered'
       WHERE ${visibleSellerSql} ${regionId ? "AND p.region_id=$1" : ""}`,
      regionParameter,
    ),
    pool.query(
      `SELECT count(*)::int AS count FROM market_regions
        WHERE active=true AND type='district' ${regionId ? "AND (id=$1 OR parent_id=$1)" : ""}`,
      regionParameter,
    ),
  ]);

  const opportunityRow = opportunityResult.rows[0] as Row | undefined;
  const currentOpportunityListings = numeric(opportunityRow?.active_listings);
  const opportunityMinimum = numeric(opportunityRow?.minimum_active_listings);
  const ttlMinutes = Math.min(10_080, Math.max(15, Number(process.env.OPPORTUNITY_CLAIM_TTL_MINUTES || 1_440)));
  const opportunity = opportunityRow ? {
    id: String(opportunityRow.id),
    productName: String(opportunityRow.product_name),
    regionId: String(opportunityRow.region_id),
    regionName: String(opportunityRow.region_name),
    description: `${String(opportunityRow.product_name)} has ${currentOpportunityListings} active listing${currentOpportunityListings === 1 ? "" : "s"} against a regional target of ${opportunityMinimum}.`,
    eligibleSellersCount: numeric(opportunityRow.eligible_sellers),
    priority: currentOpportunityListings === 0 ? "Urgent" : currentOpportunityListings < opportunityMinimum ? "High" : "Medium",
    lockTimeHours: Math.round((ttlMinutes / 60) * 10) / 10,
    imageUrl: text(opportunityRow.image_url),
    status: String(opportunityRow.status),
    claimable: opportunityRow.claimable === true,
    isAccepted: String(opportunityRow.claimed_by ?? "") === userId,
    claimExpiresAt: opportunityRow.claim_expires_at ? new Date(opportunityRow.claim_expires_at).toISOString() : null,
  } : null;

  const statusRow = statusResult.rows[0] ?? {};
  const activeSellers = numeric(statusRow.active_sellers);
  const previousSellers = numeric(statusRow.previous_sellers);
  const productsListed = numeric(statusRow.products_listed);
  const previousProducts = numeric(statusRow.previous_products);
  const orders30Days = numeric(statusRow.orders_30_days);
  const previousOrders = numeric(statusRow.previous_orders);
  const avgDeliveryDays = statusRow.avg_delivery_days == null ? null : Math.round(numeric(statusRow.avg_delivery_days) * 10) / 10;

  const regionLabel = selectedRegion ? String(selectedRegion.name) : "All regions";
  return {
    generatedAt: new Date().toISOString(),
    scope,
    selectedRegion: selectedRegion ? {
      id: String(selectedRegion.id), name: String(selectedRegion.name), type: String(selectedRegion.type),
      countryCode: String(selectedRegion.country_code), latitude: selectedRegion.latitude == null ? null : numeric(selectedRegion.latitude),
      longitude: selectedRegion.longitude == null ? null : numeric(selectedRegion.longitude),
    } : null,
    regions: regionsResult.rows,
    selection: {
      categoryId: filters.category ?? null,
      subcategoryId: filters.subCategory ?? null,
      variety: filters.variety ?? null,
      queryLabel: filters.search?.trim() || filters.variety?.trim() || null,
    },
    kpiStats: {
      totalProducts: filteredProductCount,
      approvedSellers: approvedSellerIds.size,
      citiesCovered: coveredLocations.size,
      districtsCount: numeric(districtResult.rows[0]?.count),
      avgDeliveryDays,
    },
    categoriesNav,
    varieties,
    productTotal: filteredProductCount,
    products: allProducts.slice(0, 60),
    verifiedOrganisations: organisationsResult.rows.map((row: Row) => ({
      id: String(row.id), name: String(row.name), location: text(row.location), role: String(row.type),
      verified: true, productCount: numeric(row.product_count),
    })),
    largeFarmers: farmersResult.rows.map((row: Row) => ({
      id: String(row.id), name: String(row.name), location: text(row.location), role: "Farmer",
      verified: true, avatar: text(row.avatar), productCount: numeric(row.product_count), totalStock: numeric(row.total_stock),
    })),
    regionalManagers: managersResult.rows.map((row: Row) => ({
      id: String(row.id), name: String(row.name), location: text(row.location), role: String(row.role),
      verified: true, avatar: text(row.avatar),
    })),
    liveSellers: liveSellersResult.rows.map((row: Row) => ({
      id: String(row.id), name: String(row.name), rating: numeric(row.rating),
      distanceKm: distanceKm(selectedRegion?.latitude, selectedRegion?.longitude, row.latitude, row.longitude),
      productCount: numeric(row.product_count), avatar: text(row.avatar), isOnline: true,
      verified: row.seller_verified === true,
      sessionExpiresAt: row.session_expires_at ? new Date(row.session_expires_at).toISOString() : null,
    })),
    mapClusters: mapResult.rows.map((row: Row) => ({
      id: String(row.id), name: String(row.name), type: String(row.type),
      latitude: row.latitude == null ? null : numeric(row.latitude), longitude: row.longitude == null ? null : numeric(row.longitude),
      sellerCount: numeric(row.seller_count), organisationCount: numeric(row.organisation_count),
      largeFarmerCount: numeric(row.large_farmer_count),
    })),
    opportunity,
    marketplaceStatus: {
      regionName: regionLabel,
      activeSellers,
      activeSellersDeltaPercent: percentageDelta(activeSellers, previousSellers),
      productsListed,
      productsListedDeltaPercent: percentageDelta(productsListed, previousProducts),
      orders30Days,
      orders30DaysDeltaPercent: percentageDelta(orders30Days, previousOrders),
      avgDeliveryDays,
    },
  };
}
