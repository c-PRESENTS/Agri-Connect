import { pool } from "../config/db";

export function normalizeProductKey(value: string): string {
  return value.trim().toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export type ActiveRegionAssignment = {
  id: string;
  sellerId: string;
  organisationId: string | null;
  regionId: string;
  regionName: string;
  regionCode: string;
  countryCode: string;
  status: "pending" | "active" | "rejected" | "suspended" | "expired";
  canPublish: boolean;
  canFulfil: boolean;
};

function assignmentFromRow(row: Record<string, any>): ActiveRegionAssignment {
  return {
    id: row.id,
    sellerId: row.seller_id,
    organisationId: row.organisation_id ?? null,
    regionId: row.region_id,
    regionName: row.region_name,
    regionCode: row.region_code,
    countryCode: row.country_code,
    status: row.status,
    canPublish: row.can_publish,
    canFulfil: row.can_fulfil,
  };
}

function productKeySql(column: string): string {
  return `trim(both '-' from lower(regexp_replace(${column},'[^a-zA-Z0-9]+','-','g')))`;
}

export class RegionalMarketplaceRepository {
  async isProductMarketplaceEligible(productId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM commerce_products p
       JOIN seller_region_assignments sra ON sra.seller_id=p.farmer_id AND sra.region_id=p.region_id
       JOIN market_regions r ON r.id=p.region_id
       JOIN users u ON u.id=p.farmer_id
       WHERE p.id=$1 AND r.active=true AND sra.status='active' AND sra.can_publish=true
         AND (sra.effective_at IS NULL OR sra.effective_at<=now())
         AND (sra.expires_at IS NULL OR sra.expires_at>now())
         AND ((u.auth_method='catalog_seed' AND u.is_verified=true) OR EXISTS (
           SELECT 1 FROM seller_verification_cases svc WHERE svc.seller_id=p.farmer_id
             AND svc.status='verified' AND (svc.expires_at IS NULL OR svc.expires_at>now())
         ))`,
      [productId],
    );
    return Boolean(result.rows[0]);
  }

  async resolveNearestOperationalRegion(latitude: number, longitude: number): Promise<{ id: string; name: string; countryCode: string; distanceKm: number } | null> {
    const result = await pool.query(
      `SELECT r.id,r.name,r.country_code,
        (6371 * 2 * asin(sqrt(
          power(sin(radians(r.latitude-$1)/2),2) +
          cos(radians($1))*cos(radians(r.latitude))*power(sin(radians(r.longitude-$2)/2),2)
        ))) AS distance_km
       FROM market_regions r
       WHERE r.active=true AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
         AND r.type IN ('district','county','city','locality','zone')
         AND EXISTS (SELECT 1 FROM seller_region_assignments sra WHERE sra.region_id=r.id AND sra.status='active' AND sra.can_publish=true)
       ORDER BY distance_km
       LIMIT 1`,
      [latitude, longitude],
    );
    const row = result.rows[0];
    return row ? { id: row.id, name: row.name, countryCode: row.country_code, distanceKm: Number(row.distance_km) } : null;
  }
  async getEligibleProductRegions(productIds: string[]): Promise<Map<string, { regionId: string; regionName: string; canFulfil: boolean }>> {
    if (productIds.length === 0) return new Map();
    const result = await pool.query(
      `SELECT p.id,r.id AS region_id,r.name AS region_name,sra.can_fulfil
         FROM commerce_products p
         JOIN market_regions r ON r.id=p.region_id AND r.active=true
         JOIN seller_region_assignments sra ON sra.seller_id=p.farmer_id AND sra.region_id=p.region_id
         JOIN users u ON u.id=p.farmer_id
        WHERE p.id=ANY($1::varchar[]) AND sra.status='active' AND sra.can_publish=true
          AND (sra.effective_at IS NULL OR sra.effective_at<=now())
          AND (sra.expires_at IS NULL OR sra.expires_at>now())
          AND ((u.auth_method='catalog_seed' AND u.is_verified=true) OR EXISTS (
            SELECT 1 FROM seller_verification_cases svc WHERE svc.seller_id=p.farmer_id
              AND svc.status='verified' AND (svc.expires_at IS NULL OR svc.expires_at>now())
          ))`,
      [productIds],
    );
    return new Map(
      result.rows.map((row: { id: string; region_id: string; region_name: string; can_fulfil: boolean }) => [
        row.id,
        { regionId: row.region_id, regionName: row.region_name, canFulfil: row.can_fulfil },
      ]),
    );
  }

  async listRegions(): Promise<Array<Record<string, unknown>>> {
    const result = await pool.query(
      `SELECT r.id,r.parent_id AS "parentId",r.code,r.name,r.country_code AS "countryCode",
              r.type,r.latitude,r.longitude,r.data_version AS "dataVersion",
              count(sra.id)::int AS "activeSellerCount"
         FROM market_regions r
         LEFT JOIN seller_region_assignments sra ON sra.region_id=r.id
          AND sra.status='active' AND sra.can_publish=true
        WHERE r.active=true
        GROUP BY r.id
        ORDER BY r.country_code,r.type,r.name`,
    );
    return result.rows;
  }

  async createRegion(input: Record<string, any>): Promise<Record<string, unknown>> {
    const result = await pool.query(
      `INSERT INTO market_regions
         (parent_id,code,name,country_code,type,latitude,longitude,data_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id,parent_id AS "parentId",code,name,country_code AS "countryCode",type,latitude,longitude,data_version AS "dataVersion"`,
      [input.parentId ?? null, input.code, input.name, input.countryCode, input.type, input.latitude ?? null, input.longitude ?? null, process.env.REGION_DATA_VERSION || "2026-08"],
    );
    return result.rows[0];
  }

  async createRegionalOrganisation(actorId: string, input: { name: string; officialEmail: string; managerEmail: string; regionId: string }): Promise<Record<string, unknown>> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const manager = await client.query("SELECT id FROM users WHERE lower(email)=lower($1) LIMIT 1", [input.managerEmail]);
      if (!manager.rows[0]) throw new Error("MANAGER_NOT_FOUND");
      const slugBase = input.name.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "regional-partner";
      const organisation = await client.query(
        `INSERT INTO organisations (type,name,slug,official_email,status,verified_at,metadata)
         VALUES ('external',$1,$2 || '-' || substr(gen_random_uuid()::text,1,8),$3,'approved',now(),jsonb_build_object('createdBy',$4::text,'approvalMode','delegated_regional'))
         RETURNING id,name,slug,official_email AS "officialEmail",status`,
        [input.name, slugBase, input.officialEmail.toLowerCase(), actorId],
      );
      const organisationId = organisation.rows[0].id;
      const role = await client.query(
        `INSERT INTO admin_roles (organisation_id,scope,code,name,description,is_system,is_super_admin)
         VALUES ($1,'organisation','regional_manager','Regional marketplace manager','Approve sellers and products only within assigned regions.',true,false)
         RETURNING id`,
        [organisationId],
      );
      await client.query(
        `INSERT INTO admin_role_permissions (role_id,permission_id)
         SELECT $1,id FROM admin_permissions WHERE code IN ('dashboard.view','users.view','users.approve','products.view','products.approve','verification.view')
         ON CONFLICT DO NOTHING`,
        [role.rows[0].id],
      );
      await client.query(
        `INSERT INTO organisation_memberships (organisation_id,user_id,role_id,status,invited_by,invited_at,accepted_at)
         VALUES ($1,$2,$3,'active',$4,now(),now())`,
        [organisationId, manager.rows[0].id, role.rows[0].id, actorId],
      );
      await client.query(
        `INSERT INTO organisation_region_assignments
           (organisation_id,region_id,status,can_approve_sellers,can_approve_products,approved_by,effective_at,reason)
         VALUES ($1,$2,'active',true,true,$3,now(),'Approved regional operating partner')`,
        [organisationId, input.regionId, actorId],
      );
      await client.query("COMMIT");
      return { ...organisation.rows[0], managerUserId: manager.rows[0].id, regionId: input.regionId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listSellerAssignments(sellerId: string): Promise<ActiveRegionAssignment[]> {
    const result = await pool.query(
      `SELECT sra.*,r.name AS region_name,r.code AS region_code,r.country_code
         FROM seller_region_assignments sra
         JOIN market_regions r ON r.id=sra.region_id
        WHERE sra.seller_id=$1
        ORDER BY CASE sra.status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,r.name`,
      [sellerId],
    );
    return result.rows.map(assignmentFromRow);
  }

  async listEligibleOrganisationsForRegion(regionId: string): Promise<Array<Record<string, unknown>>> {
    const result = await pool.query(
      `SELECT o.id,o.name FROM organisations o
       JOIN organisation_region_assignments ora ON ora.organisation_id=o.id
       WHERE ora.region_id=$1 AND o.status='approved' AND ora.status='active' AND ora.can_approve_sellers=true
         AND (ora.expires_at IS NULL OR ora.expires_at>now()) ORDER BY o.name`,
      [regionId],
    );
    return result.rows;
  }

  async getActiveSellerAssignment(sellerId: string, regionId?: string): Promise<ActiveRegionAssignment | null> {
    const params: unknown[] = [sellerId];
    let regionWhere = "";
    if (regionId) {
      params.push(regionId);
      regionWhere = ` AND (sra.region_id=$${params.length} OR sra.id=$${params.length})`;
    }
    const result = await pool.query(
      `SELECT sra.*,r.name AS region_name,r.code AS region_code,r.country_code
         FROM seller_region_assignments sra
         JOIN market_regions r ON r.id=sra.region_id AND r.active=true
        WHERE sra.seller_id=$1 AND sra.status='active' AND sra.can_publish=true
          AND (sra.effective_at IS NULL OR sra.effective_at<=now())
          AND (sra.expires_at IS NULL OR sra.expires_at>now())${regionWhere}
        ORDER BY sra.approved_at DESC NULLS LAST
        LIMIT 1`,
      params,
    );
    return result.rows[0] ? assignmentFromRow(result.rows[0]) : null;
  }

  async requestSellerAssignment(sellerId: string, regionId: string, organisationId?: string | null): Promise<Record<string, unknown>> {
    if (organisationId && !await this.organisationCanApproveRegion(organisationId, regionId)) {
      throw new Error("ORGANISATION_REGION_MISMATCH");
    }
    const result = await pool.query(
      `INSERT INTO seller_region_assignments (seller_id,organisation_id,region_id,status,can_publish,can_fulfil)
       VALUES ($1,$2,$3,'pending',false,false)
       ON CONFLICT (seller_id,region_id) DO UPDATE SET
         organisation_id=EXCLUDED.organisation_id,status='pending',can_publish=false,can_fulfil=false,
         requested_at=now(),approved_by=NULL,approved_at=NULL,reason=NULL,updated_at=now()
       RETURNING id,seller_id AS "sellerId",organisation_id AS "organisationId",region_id AS "regionId",status,requested_at AS "requestedAt"`,
      [sellerId, organisationId ?? null, regionId],
    );
    return result.rows[0];
  }

  async listAssignmentsForReview(): Promise<Array<Record<string, unknown>>> {
    const result = await pool.query(
      `SELECT sra.id,sra.seller_id AS "sellerId",
              COALESCE(NULLIF(u.name,''),NULLIF(concat_ws(' ',u.first_name,u.last_name),''),u.email) AS "sellerName",
              sra.organisation_id AS "organisationId",o.name AS "organisationName",
              r.id AS "regionId",r.name AS "regionName",r.code AS "regionCode",r.country_code AS "countryCode",
              sra.status,sra.can_publish AS "canPublish",sra.can_fulfil AS "canFulfil",
              sra.requested_at AS "requestedAt",sra.approved_at AS "approvedAt",sra.expires_at AS "expiresAt",sra.reason
         FROM seller_region_assignments sra
         JOIN users u ON u.id=sra.seller_id
         JOIN market_regions r ON r.id=sra.region_id
         LEFT JOIN organisations o ON o.id=sra.organisation_id
        ORDER BY CASE sra.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,sra.requested_at DESC`,
    );
    return result.rows;
  }

  async listReviewerOrganisationIds(userId: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT DISTINCT m.organisation_id
         FROM organisation_memberships m
         JOIN organisations o ON o.id=m.organisation_id
         JOIN admin_roles r ON r.id=m.role_id
         JOIN organisation_region_assignments ora ON ora.organisation_id=m.organisation_id
        WHERE m.user_id=$1 AND m.status='active' AND o.status='approved' AND r.scope='organisation'
          AND ora.status='active' AND ora.can_approve_sellers=true
          AND (ora.effective_at IS NULL OR ora.effective_at<=now())
          AND (ora.expires_at IS NULL OR ora.expires_at>now())`,
      [userId],
    );
    return result.rows.map((row: { organisation_id: string }) => row.organisation_id);
  }

  async listAssignmentsForOrganisationReview(organisationIds: string[]): Promise<Array<Record<string, unknown>>> {
    if (organisationIds.length === 0) return [];
    const result = await pool.query(
      `SELECT sra.id,sra.seller_id AS "sellerId",
              COALESCE(NULLIF(u.name,''),NULLIF(concat_ws(' ',u.first_name,u.last_name),''),u.email) AS "sellerName",
              sra.organisation_id AS "organisationId",o.name AS "organisationName",
              r.id AS "regionId",r.name AS "regionName",r.code AS "regionCode",r.country_code AS "countryCode",
              sra.status,sra.can_publish AS "canPublish",sra.can_fulfil AS "canFulfil",
              sra.requested_at AS "requestedAt",sra.approved_at AS "approvedAt",sra.expires_at AS "expiresAt",sra.reason
         FROM seller_region_assignments sra
         JOIN users u ON u.id=sra.seller_id
         JOIN market_regions r ON r.id=sra.region_id
         JOIN organisations o ON o.id=sra.organisation_id
         JOIN organisation_region_assignments ora ON ora.organisation_id=sra.organisation_id AND ora.region_id=sra.region_id
        WHERE sra.organisation_id=ANY($1::varchar[]) AND ora.status='active' AND ora.can_approve_sellers=true
          AND (ora.effective_at IS NULL OR ora.effective_at<=now())
          AND (ora.expires_at IS NULL OR ora.expires_at>now())
        ORDER BY CASE sra.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,sra.requested_at DESC`,
      [organisationIds],
    );
    return result.rows;
  }

  async getAssignmentForReview(id: string): Promise<{ id: string; organisationId: string | null; regionId: string } | null> {
    const result = await pool.query("SELECT id,organisation_id AS \"organisationId\",region_id AS \"regionId\" FROM seller_region_assignments WHERE id=$1", [id]);
    return result.rows[0] ?? null;
  }

  async organisationCanApproveRegion(organisationId: string, regionId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM organisation_region_assignments ora
       JOIN organisations o ON o.id=ora.organisation_id
       WHERE ora.organisation_id=$1 AND ora.region_id=$2 AND ora.status='active'
         AND ora.can_approve_sellers=true AND o.status='approved'
         AND (ora.effective_at IS NULL OR ora.effective_at<=now())
         AND (ora.expires_at IS NULL OR ora.expires_at>now())`,
      [organisationId, regionId],
    );
    return Boolean(result.rows[0]);
  }

  async reviewAssignment(id: string, reviewerId: string, input: Record<string, any>): Promise<Record<string, unknown> | null> {
    const enabled = input.status === "active";
    const result = await pool.query(
      `UPDATE seller_region_assignments SET
         status=$2,can_publish=$3,can_fulfil=$4,approved_by=$5,
         approved_at=CASE WHEN $2='active' THEN now() ELSE approved_at END,
         effective_at=CASE WHEN $2='active' THEN now() ELSE effective_at END,
         expires_at=$6,reason=$7,updated_at=now()
       WHERE id=$1
       RETURNING id,seller_id AS "sellerId",organisation_id AS "organisationId",region_id AS "regionId",status,
                 can_publish AS "canPublish",can_fulfil AS "canFulfil",approved_at AS "approvedAt",expires_at AS "expiresAt",reason`,
      [id, input.status, enabled && input.canPublish, enabled && input.canFulfil, reviewerId, input.expiresAt ? new Date(input.expiresAt) : null, input.reason],
    );
    return result.rows[0] ?? null;
  }

  async attachProductRegion(productId: string, assignment: ActiveRegionAssignment): Promise<void> {
    await pool.query(
      `UPDATE commerce_products SET region_id=$2,product_data=jsonb_set(jsonb_set(product_data,'{regionId}',to_jsonb($2::text),true),'{regionName}',to_jsonb($3::text),true),updated_at=now() WHERE id=$1`,
      [productId, assignment.regionId, assignment.regionName],
    );
  }

  async attachOpportunityListing(opportunityId: string, sellerId: string, listingId: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE regional_product_opportunities o SET status='listing_submitted',listing_id=$3,updated_at=now()
       WHERE o.id=$1 AND o.claimed_by=$2 AND o.status='claimed' AND o.claim_expires_at>now()
         AND EXISTS (SELECT 1 FROM commerce_products p WHERE p.id=$3 AND p.farmer_id=$2 AND p.region_id=o.region_id
           AND ${productKeySql("p.name")}=o.product_key)
       RETURNING id`,
      [opportunityId, sellerId, listingId],
    );
    return Boolean(result.rows[0]);
  }

  async listTrustedOrganisations(regionId?: string): Promise<Array<Record<string, unknown>>> {
    const params: unknown[] = [];
    const regionWhere = regionId ? (params.push(regionId), ` AND ora.region_id=$${params.length}`) : "";
    const result = await pool.query(
      `SELECT DISTINCT o.id,o.name,o.slug,r.id AS "regionId",r.name AS "regionName",
              ora.can_approve_sellers AS "canApproveSellers"
         FROM organisations o
         JOIN organisation_region_assignments ora ON ora.organisation_id=o.id
         JOIN market_regions r ON r.id=ora.region_id
        WHERE o.status='approved' AND ora.status='active'
          AND (ora.expires_at IS NULL OR ora.expires_at>now())${regionWhere}
        ORDER BY o.name`,
      params,
    );
    return result.rows;
  }

  async createTarget(actorId: string, input: Record<string, any>): Promise<Record<string, unknown>> {
    const productKey = normalizeProductKey(input.productName);
    const result = await pool.query(
      `INSERT INTO regional_catalog_targets
         (region_id,product_key,product_name,category_id,subcategory_id,minimum_active_listings,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (region_id,product_key) DO UPDATE SET
         product_name=EXCLUDED.product_name,category_id=EXCLUDED.category_id,
         subcategory_id=EXCLUDED.subcategory_id,minimum_active_listings=EXCLUDED.minimum_active_listings,
         active=true,updated_at=now()
       RETURNING id,region_id AS "regionId",product_key AS "productKey",product_name AS "productName",
                 category_id AS "categoryId",subcategory_id AS "subcategoryId",minimum_active_listings AS "minimumActiveListings",active`,
      [input.regionId, productKey, input.productName, input.categoryId, input.subcategoryId, input.minimumActiveListings, actorId],
    );
    return result.rows[0];
  }

  async scanOpportunities(): Promise<{ opened: number; completed: number }> {
    await this.releaseExpiredClaims();
    const completed = await pool.query(
      `UPDATE regional_product_opportunities o SET status='completed',completed_at=now(),updated_at=now()
        WHERE o.status IN ('open','claimed','listing_submitted')
          AND (SELECT count(*) FROM commerce_products p
               JOIN seller_region_assignments sra ON sra.seller_id=p.farmer_id AND sra.region_id=o.region_id
               WHERE p.region_id=o.region_id AND sra.status='active' AND sra.can_publish=true
                 AND COALESCE(p.product_data->>'publicationStatus','published')='published'
                 AND p.stock>0 AND ${productKeySql("p.name")}=o.product_key
                 AND (o.claimed_by IS NULL OR p.farmer_id=o.claimed_by)) >=
              (SELECT minimum_active_listings FROM regional_catalog_targets WHERE id=o.target_id)
       RETURNING id`,
    );
    const opened = await pool.query(
      `INSERT INTO regional_product_opportunities
         (target_id,region_id,product_key,product_name,category_id,subcategory_id,status)
       SELECT t.id,t.region_id,t.product_key,t.product_name,t.category_id,t.subcategory_id,'open'
         FROM regional_catalog_targets t
        WHERE t.active=true
          AND (SELECT count(*) FROM commerce_products p
               JOIN seller_region_assignments sra ON sra.seller_id=p.farmer_id AND sra.region_id=t.region_id
               WHERE p.region_id=t.region_id AND sra.status='active' AND sra.can_publish=true
                 AND COALESCE(p.product_data->>'publicationStatus','published')='published'
                 AND p.stock>0 AND ${productKeySql("p.name")}=t.product_key) < t.minimum_active_listings
          AND NOT EXISTS (SELECT 1 FROM regional_product_opportunities o WHERE o.target_id=t.id AND o.status IN ('open','claimed','listing_submitted'))
       ON CONFLICT DO NOTHING
       RETURNING id,region_id,product_name`,
    );
    for (const row of opened.rows) {
      await pool.query(
        `INSERT INTO marketplace_notifications (user_id,type,title,message,action_url,data)
         SELECT DISTINCT sra.seller_id,'regional_opportunity','Opportunity Available',
           $2 || ' is not currently listed in the ' || $3 || ' marketplace. Be the first approved seller to list this product.',
           '/seller',jsonb_build_object('opportunityId',$1,'regionId',$4)
         FROM seller_region_assignments sra
         JOIN market_regions r ON r.id=sra.region_id
         WHERE sra.region_id=$4 AND sra.status='active' AND sra.can_publish=true`,
        [row.id, row.product_name, await this.regionName(row.region_id), row.region_id],
      );
    }
    return { opened: opened.rowCount ?? 0, completed: completed.rowCount ?? 0 };
  }

  private async regionName(regionId: string): Promise<string> {
    const result = await pool.query("SELECT name FROM market_regions WHERE id=$1", [regionId]);
    return result.rows[0]?.name ?? "regional";
  }

  async releaseExpiredClaims(): Promise<number> {
    const result = await pool.query(
      `UPDATE regional_product_opportunities SET status='open',claimed_by=NULL,claim_expires_at=NULL,listing_id=NULL,updated_at=now()
        WHERE status IN ('claimed','listing_submitted') AND claim_expires_at<=now() RETURNING id`,
    );
    return result.rowCount ?? 0;
  }

  async listSellerOpportunities(sellerId: string): Promise<Array<Record<string, unknown>>> {
    await this.releaseExpiredClaims();
    const result = await pool.query(
      `SELECT o.id,o.product_name AS "productName",o.category_id AS "categoryId",o.subcategory_id AS "subcategoryId",
              o.status,o.claimed_by AS "claimedBy",o.claim_expires_at AS "claimExpiresAt",o.listing_id AS "listingId",
              r.id AS "regionId",r.name AS "regionName"
         FROM regional_product_opportunities o
         JOIN market_regions r ON r.id=o.region_id
         JOIN seller_region_assignments sra ON sra.region_id=o.region_id AND sra.seller_id=$1
        WHERE sra.status='active' AND sra.can_publish=true
          AND (o.status='open' OR o.claimed_by=$1)
        ORDER BY CASE o.status WHEN 'claimed' THEN 0 WHEN 'listing_submitted' THEN 1 ELSE 2 END,o.created_at DESC`,
      [sellerId],
    );
    return result.rows;
  }

  async claimOpportunity(opportunityId: string, sellerId: string, ttlMinutes: number): Promise<Record<string, unknown> | null> {
    const result = await pool.query(
      `UPDATE regional_product_opportunities o SET
         status='claimed',claimed_by=$2,claim_expires_at=now()+($3::text || ' minutes')::interval,updated_at=now()
       WHERE o.id=$1 AND (o.status='open' OR (o.status IN ('claimed','listing_submitted') AND o.claim_expires_at<=now()))
         AND EXISTS (SELECT 1 FROM seller_region_assignments sra WHERE sra.seller_id=$2 AND sra.region_id=o.region_id AND sra.status='active' AND sra.can_publish=true)
       RETURNING id,product_name AS "productName",region_id AS "regionId",status,claimed_by AS "claimedBy",claim_expires_at AS "claimExpiresAt"`,
      [opportunityId, sellerId, ttlMinutes],
    );
    return result.rows[0] ?? null;
  }

  async cancelOpportunity(opportunityId: string, sellerId: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE regional_product_opportunities SET status='open',claimed_by=NULL,claim_expires_at=NULL,listing_id=NULL,updated_at=now()
        WHERE id=$1 AND claimed_by=$2 AND status IN ('claimed','listing_submitted')`,
      [opportunityId, sellerId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async completeOpportunity(opportunityId: string, sellerId: string, listingId: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE regional_product_opportunities o SET status='completed',listing_id=$3,completed_at=now(),updated_at=now()
        WHERE o.id=$1 AND o.claimed_by=$2 AND o.status IN ('claimed','listing_submitted') AND o.claim_expires_at>now()
          AND EXISTS (SELECT 1 FROM commerce_products p WHERE p.id=$3 AND p.farmer_id=$2 AND p.region_id=o.region_id
            AND ${productKeySql("p.name")}=o.product_key)
       RETURNING id`,
      [opportunityId, sellerId, listingId],
    );
    return Boolean(result.rows[0]);
  }

  async listNotifications(userId: string): Promise<Array<Record<string, unknown>>> {
    const result = await pool.query(
      `SELECT id,type,title,message,action_url AS "actionUrl",data,read_at AS "readAt",created_at AS "createdAt"
         FROM marketplace_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [userId],
    );
    return result.rows;
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    const result = await pool.query("UPDATE marketplace_notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2", [id, userId]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const regionalMarketplaceRepository = new RegionalMarketplaceRepository();
