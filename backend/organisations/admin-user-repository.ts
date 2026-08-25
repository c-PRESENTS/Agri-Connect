import type {
  AdminUserDetailResponse,
  AdminUserListItem,
  AdminUsersResponse,
  AdminVerificationDetailResponse,
  AdminVerificationQueueResponse,
} from "@shared/schema";
import { pool } from "../config/db";
import { sellerCapabilities } from "../seller-verification/capabilities";
import { sellerVerificationService } from "../seller-verification/service";
import type { AdminUserDirectoryQuery, AdminVerificationQueueQuery } from "./admin-user-validation";

const USER_SORT_COLUMNS: Record<AdminUserDirectoryQuery["sort"], string> = {
  createdAt: "u.created_at",
  updatedAt: "u.updated_at",
  lastLoginAt: "last_login.last_login_at",
  name: "display_name",
  email: "u.email",
};

const VERIFICATION_SORT_COLUMNS: Record<AdminVerificationQueueQuery["sort"], string> = {
  submittedAt: "svc.submitted_at",
  updatedAt: "svc.updated_at",
  legalName: "sbp.legal_name",
};

function iso(value: Date | string | null | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

function directoryItem(row: Record<string, any>): AdminUserListItem {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    accountType: row.account_type,
    sellerEnabled: row.seller_enabled === true,
    accountStatus: row.account_status,
    verificationStatus: row.verification_status,
    country: row.country ?? null,
    region: row.region ?? null,
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
    lastLoginAt: iso(row.last_login_at),
  };
}

export async function listAdminUsers(query: AdminUserDirectoryQuery): Promise<AdminUsersResponse> {
  const values: unknown[] = [];
  const where: string[] = [];
  const add = (value: unknown) => { values.push(value); return `$${values.length}`; };

  if (query.search) {
    const parameter = add(`%${query.search.toLocaleLowerCase("en")}%`);
    where.push(`lower(concat_ws(' ',u.name,u.first_name,u.last_name,u.email,u.phone)) LIKE ${parameter}`);
  }
  if (query.accountType) where.push(`u.role=${add(query.accountType)}`);
  if (query.status) where.push(`u.account_status=${add(query.status)}`);
  if (query.verification) {
    if (query.verification === "not_verified") where.push("svc.status IS NULL AND u.is_verified=false");
    else if (query.verification === "verified") where.push("(svc.status='verified' OR (svc.status IS NULL AND u.is_verified=true))");
    else where.push(`svc.status=${add(query.verification)}`);
  }
  if (query.country) where.push(`COALESCE(svc.country,sbp.country)=${add(query.country)}`);
  if (query.region) where.push(`lower(COALESCE(region.name,u.location,'')) LIKE ${add(`%${query.region.toLocaleLowerCase("en")}%`)}`);
  if (query.registeredFrom) where.push(`u.created_at>=${add(query.registeredFrom)}`);
  if (query.registeredTo) where.push(`u.created_at<=${add(query.registeredTo)}`);
  if (query.lastLoginFrom) where.push(`last_login.last_login_at>=${add(query.lastLoginFrom)}`);
  if (query.lastLoginTo) where.push(`last_login.last_login_at<=${add(query.lastLoginTo)}`);

  const pageSizeParameter = add(query.pageSize);
  const offsetParameter = add((query.page - 1) * query.pageSize);
  const result = await pool.query(
    `SELECT u.id,
            COALESCE(NULLIF(u.name,''),NULLIF(concat_ws(' ',u.first_name,u.last_name),''),u.email,u.phone,'Unnamed user') AS display_name,
            u.email,u.phone,u.role AS account_type,u.seller_enabled,u.account_status,
            CASE WHEN svc.status IS NOT NULL THEN svc.status WHEN u.is_verified THEN 'verified' ELSE 'not_verified' END AS verification_status,
            COALESCE(svc.country,sbp.country) AS country,COALESCE(region.name,u.location) AS region,
            u.created_at,u.updated_at,last_login.last_login_at,count(*) OVER()::int AS total_count
       FROM users u
       LEFT JOIN seller_verification_cases svc ON svc.seller_id=u.id
       LEFT JOIN seller_business_profiles sbp ON sbp.seller_id=u.id
       LEFT JOIN LATERAL (
         SELECT mr.name FROM seller_region_assignments sra JOIN market_regions mr ON mr.id=sra.region_id
          WHERE sra.seller_id=u.id ORDER BY (sra.status='active') DESC,sra.updated_at DESC LIMIT 1
       ) region ON true
       LEFT JOIN LATERAL (
         SELECT max(ale.occurred_at) AS last_login_at FROM account_login_events ale
          WHERE ale.user_id=u.id AND ale.outcome='success'
       ) last_login ON true
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY ${USER_SORT_COLUMNS[query.sort]} ${query.direction === "asc" ? "ASC" : "DESC"} NULLS LAST,u.id ASC
      LIMIT ${pageSizeParameter} OFFSET ${offsetParameter}`,
    values,
  );
  const total = Number(result.rows[0]?.total_count ?? 0);
  const [countryResult, regionResult] = await Promise.all([
    pool.query("SELECT DISTINCT country FROM seller_business_profiles WHERE country IS NOT NULL ORDER BY country LIMIT 250"),
    pool.query(`SELECT DISTINCT COALESCE(mr.name,u.location) AS region FROM users u
      LEFT JOIN seller_region_assignments sra ON sra.seller_id=u.id
      LEFT JOIN market_regions mr ON mr.id=sra.region_id
      WHERE COALESCE(mr.name,u.location) IS NOT NULL ORDER BY region LIMIT 250`),
  ]);
  return {
    users: result.rows.map(directoryItem),
    pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) },
    filters: {
      accountTypes: ["buyer", "farmer", "logistics", "admin"],
      accountStatuses: ["active", "suspended", "deactivated"],
      verificationStatuses: ["not_verified", "not_started", "in_progress", "pending_review", "needs_information", "verified", "rejected", "expired", "suspended"],
      countries: countryResult.rows.map((row: Record<string, any>) => row.country),
      regions: regionResult.rows.map((row: Record<string, any>) => row.region),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetailResponse | null> {
  const result = await pool.query(
    `SELECT u.id,
            COALESCE(NULLIF(u.name,''),NULLIF(concat_ws(' ',u.first_name,u.last_name),''),u.email,u.phone,'Unnamed user') AS display_name,
            u.email,u.phone,u.role AS account_type,u.seller_enabled,u.account_status,u.account_status_reason,
            u.avatar,u.profile_image_url,u.rating,u.review_count,u.profile_complete,u.location,u.created_at,u.updated_at,
            CASE WHEN svc.status IS NOT NULL THEN svc.status WHEN u.is_verified THEN 'verified' ELSE 'not_verified' END AS verification_status,
            COALESCE(svc.country,sbp.country) AS country,COALESCE(region.name,u.location) AS region,last_login.last_login_at,
            svc.id AS verification_case_id,svc.status AS seller_verification_status,svc.updated_at AS verification_updated_at,
            sbp.legal_name,sbp.trading_name,sbp.entity_type,sbp.primary_activities,
            (u.account_status='active' AND ((u.auth_method='catalog_seed' AND u.is_verified=true) OR
              (svc.status='verified' AND (svc.expires_at IS NULL OR svc.expires_at>now())))) AS publicly_verified,
            (u.account_status='active' AND EXISTS (SELECT 1 FROM seller_region_assignments active_sra
              WHERE active_sra.seller_id=u.id AND active_sra.status='active' AND active_sra.can_publish=true
                AND (active_sra.expires_at IS NULL OR active_sra.expires_at>now()))) AS publicly_discoverable
       FROM users u
       LEFT JOIN seller_verification_cases svc ON svc.seller_id=u.id
       LEFT JOIN seller_business_profiles sbp ON sbp.seller_id=u.id
       LEFT JOIN LATERAL (SELECT mr.name FROM seller_region_assignments sra JOIN market_regions mr ON mr.id=sra.region_id
         WHERE sra.seller_id=u.id ORDER BY (sra.status='active') DESC,sra.updated_at DESC LIMIT 1) region ON true
       LEFT JOIN LATERAL (SELECT max(occurred_at) AS last_login_at FROM account_login_events
         WHERE user_id=u.id AND outcome='success') last_login ON true
      WHERE u.id=$1 LIMIT 1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) return null;

  const [productResult, buyerOrderResult, sellerOrderResult, valueResult, loginResult, noteResult, auditResult, capabilities] = await Promise.all([
    pool.query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE moderation_status='approved')::int AS published,
      count(*) FILTER (WHERE moderation_status IN ('draft','pending_review','rejected','changes_requested','removed'))::int AS draft,
      count(*) FILTER (WHERE moderation_status='suspended')::int AS suspended
      FROM commerce_products WHERE farmer_id=$1`, [userId]),
    pool.query("SELECT count(*)::int AS count FROM commerce_orders WHERE buyer_id=$1", [userId]),
    pool.query("SELECT count(DISTINCT order_id)::int AS count FROM commerce_order_items WHERE seller_id=$1", [userId]),
    pool.query("SELECT currency,sum(unit_price_minor*quantity)::text AS amount_minor FROM commerce_order_items WHERE seller_id=$1 GROUP BY currency ORDER BY currency", [userId]),
    pool.query("SELECT id,outcome,method,failure_code,occurred_at FROM account_login_events WHERE user_id=$1 ORDER BY occurred_at DESC LIMIT 25", [userId]),
    pool.query(`SELECT n.id,n.classification,n.note_text,n.created_at,n.updated_at,
      COALESCE(NULLIF(a.name,''),NULLIF(concat_ws(' ',a.first_name,a.last_name),''),a.email,'Former administrator') AS author_name
      FROM admin_user_notes n LEFT JOIN users a ON a.id=n.author_user_id WHERE n.subject_user_id=$1 ORDER BY n.created_at DESC LIMIT 100`, [userId]),
    pool.query(`SELECT ae.id,ae.action,ae.outcome,ae.occurred_at,
      COALESCE(NULLIF(a.name,''),NULLIF(concat_ws(' ',a.first_name,a.last_name),''),a.email,'System') AS actor_name
      FROM admin_audit_events ae LEFT JOIN users a ON a.id=ae.actor_user_id
      WHERE (ae.target_type='user' AND ae.target_id=$1)
         OR (ae.target_type='verification_case' AND ae.target_id=(SELECT id FROM seller_verification_cases WHERE seller_id=$1 LIMIT 1))
      ORDER BY ae.occurred_at DESC LIMIT 50`, [userId]),
    row.seller_enabled || row.account_type === "farmer" ? sellerCapabilities(userId) : Promise.resolve({}),
  ]);

  const products = productResult.rows[0] ?? { total: 0, published: 0, draft: 0, suspended: 0 };
  return {
    user: {
      ...directoryItem(row),
      avatar: row.avatar ?? row.profile_image_url ?? null,
      rating: Number(row.rating ?? 0),
      reviewCount: Number(row.review_count ?? 0),
      profileComplete: row.profile_complete === true,
      accountStatusReason: row.account_status_reason ?? null,
    },
    publicPreview: {
      displayName: row.display_name,
      avatar: row.avatar ?? row.profile_image_url ?? null,
      location: row.location ?? null,
      isPubliclyVerified: row.publicly_verified === true,
      isPubliclyDiscoverable: row.publicly_verified === true && row.publicly_discoverable === true,
    },
    seller: row.legal_name ? {
      legalName: row.legal_name,
      tradingName: row.trading_name ?? null,
      country: row.country,
      entityType: row.entity_type,
      primaryActivities: Array.isArray(row.primary_activities) ? row.primary_activities : [],
      verificationCaseId: row.verification_case_id ?? null,
      verificationStatus: row.seller_verification_status ?? "not_started",
      verificationUpdatedAt: iso(row.verification_updated_at),
      capabilities: capabilities as Record<string, boolean>,
    } : null,
    summary: {
      products: { total: Number(products.total), published: Number(products.published), draft: Number(products.draft), suspended: Number(products.suspended) },
      orders: {
        asBuyer: Number(buyerOrderResult.rows[0]?.count ?? 0),
        asSeller: Number(sellerOrderResult.rows[0]?.count ?? 0),
        valueByCurrency: valueResult.rows.map((item: Record<string, any>) => ({ currency: item.currency, amountMinor: String(item.amount_minor) })),
      },
    },
    loginHistory: loginResult.rows.map((item: Record<string, any>) => ({ id: item.id, outcome: item.outcome, method: item.method, failureCode: item.failure_code ?? null, occurredAt: iso(item.occurred_at)! })),
    notes: noteResult.rows.map((item: Record<string, any>) => ({ id: item.id, classification: item.classification, text: item.note_text, authorName: item.author_name, createdAt: iso(item.created_at)!, updatedAt: iso(item.updated_at)! })),
    auditTimeline: auditResult.rows.map((item: Record<string, any>) => ({ id: item.id, action: item.action, outcome: item.outcome, actorName: item.actor_name, occurredAt: iso(item.occurred_at)! })),
    generatedAt: new Date().toISOString(),
  };
}

function maskRegistrationNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, "");
  if (compact.length <= 4) return "•".repeat(compact.length);
  return `${"•".repeat(Math.min(8, compact.length - 4))}${compact.slice(-4)}`;
}

export async function getAdminVerificationDetail(caseId: string): Promise<AdminVerificationDetailResponse | null> {
  const caseResult = await pool.query(
    `SELECT svc.id,svc.seller_id,svc.status,svc.country,svc.entity_type,svc.requirements_version,svc.provider,
      svc.submitted_at,svc.reviewed_at,svc.review_reason,svc.expires_at,svc.updated_at,
      COALESCE(NULLIF(u.name,''),NULLIF(concat_ws(' ',u.first_name,u.last_name),''),u.email,'Unnamed seller') AS seller_name,
      u.email AS seller_email,u.account_status,
      sbp.legal_name,sbp.trading_name,sbp.registration_number,sbp.primary_activities,sbp.website,sbp.contact_email,sbp.contact_phone
      FROM seller_verification_cases svc
      JOIN users u ON u.id=svc.seller_id
      JOIN seller_business_profiles sbp ON sbp.seller_id=svc.seller_id
      WHERE svc.id=$1 LIMIT 1`,
    [caseId],
  );
  const row = caseResult.rows[0];
  if (!row) return null;
  const [state, eventResult, eligibilityResult] = await Promise.all([
    sellerVerificationService.status(row.seller_id),
    pool.query(`SELECT sve.id,sve.event_type,sve.created_at,
      COALESCE(NULLIF(a.name,''),NULLIF(concat_ws(' ',a.first_name,a.last_name),''),a.email,'System') AS actor_name
      FROM seller_verification_events sve LEFT JOIN users a ON a.id=sve.actor_id
      WHERE sve.case_id=$1 ORDER BY sve.created_at DESC LIMIT 100`, [caseId]),
    pool.query(`SELECT EXISTS (
      SELECT 1 FROM seller_region_assignments sra WHERE sra.seller_id=$1
       AND sra.status='active' AND sra.can_publish=true
       AND (sra.effective_at IS NULL OR sra.effective_at<=now())
       AND (sra.expires_at IS NULL OR sra.expires_at>now())
      ) AS eligible`, [row.seller_id]),
  ]);
  const publiclyVerified = row.account_status === "active"
    && row.status === "verified"
    && (!row.expires_at || new Date(row.expires_at) > new Date());
  return {
    case: {
      id: row.id,
      sellerId: row.seller_id,
      status: row.status,
      country: row.country,
      entityType: row.entity_type,
      requirementsVersion: row.requirements_version,
      provider: row.provider,
      submittedAt: iso(row.submitted_at),
      reviewedAt: iso(row.reviewed_at),
      reviewReason: row.review_reason ?? null,
      expiresAt: iso(row.expires_at),
      updatedAt: iso(row.updated_at)!,
    },
    seller: {
      displayName: row.seller_name,
      email: row.seller_email ?? null,
      accountStatus: row.account_status,
      publicProfileUrl: `/sellers/${encodeURIComponent(row.seller_id)}`,
      isPubliclyVerified: publiclyVerified,
      isRegionallyEligible: publiclyVerified && eligibilityResult.rows[0]?.eligible === true,
    },
    business: {
      legalName: row.legal_name,
      tradingName: row.trading_name ?? null,
      registrationNumberMasked: maskRegistrationNumber(row.registration_number),
      country: row.country,
      entityType: row.entity_type,
      primaryActivities: Array.isArray(row.primary_activities) ? row.primary_activities : [],
      website: row.website ?? null,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
    },
    identifiers: state.identifiers.map((item) => ({
      id: item.id,
      country: item.country,
      type: item.type,
      maskedValue: item.maskedValue,
      status: item.status,
      verifiedAt: iso(item.verifiedAt),
    })),
    people: state.people.map((item) => ({
      id: item.id,
      fullName: item.fullName,
      role: item.role,
      ownershipPercent: item.ownershipPercent ?? null,
      country: item.country,
    })),
    documents: state.documents.map((item) => ({
      id: item.id,
      requirementCode: item.requirementCode,
      documentType: item.documentType,
      issuingCountry: item.issuingCountry,
      originalFileName: item.originalFileName,
      contentType: item.contentType,
      sizeBytes: item.sizeBytes ?? null,
      status: item.status,
      rejectionReason: item.rejectionReason ?? null,
      issuedAt: iso(item.issuedAt),
      expiresAt: iso(item.expiresAt),
      uploadedAt: iso(item.uploadedAt),
      reviewedAt: iso(item.reviewedAt),
      viewUrl: item.status === "awaiting_upload" ? null : `/api/admin/verification-documents/${encodeURIComponent(item.id)}`,
    })),
    requirements: state.requirements.map((item) => ({
      code: item.code,
      label: item.label,
      description: item.description,
      kind: item.kind,
      required: item.required,
      complete: item.complete,
    })),
    events: eventResult.rows.map((item: Record<string, any>) => ({ id: item.id, eventType: item.event_type, actorName: item.actor_name, createdAt: iso(item.created_at)! })),
    generatedAt: new Date().toISOString(),
  };
}

export async function listAdminVerifications(query: AdminVerificationQueueQuery): Promise<AdminVerificationQueueResponse> {
  const values: unknown[] = [];
  const where: string[] = [];
  const add = (value: unknown) => { values.push(value); return `$${values.length}`; };
  if (query.status?.length) where.push(`svc.status=ANY(${add(query.status)}::varchar[])`);
  if (query.search) where.push(`lower(concat_ws(' ',sbp.legal_name,sbp.trading_name,u.name,u.email)) LIKE ${add(`%${query.search.toLocaleLowerCase("en")}%`)}`);
  if (query.country) where.push(`svc.country=${add(query.country)}`);
  if (query.entityType) where.push(`svc.entity_type=${add(query.entityType)}`);
  const limit = add(query.pageSize);
  const offset = add((query.page - 1) * query.pageSize);
  const result = await pool.query(
    `SELECT svc.id,svc.seller_id,svc.status,svc.country,svc.entity_type,svc.submitted_at,svc.updated_at,
      sbp.legal_name,COALESCE(NULLIF(u.name,''),NULLIF(concat_ws(' ',u.first_name,u.last_name),''),u.email,'Unnamed seller') AS seller_name,
      u.email AS seller_email,u.account_status,count(*) OVER()::int AS total_count
      FROM seller_verification_cases svc JOIN seller_business_profiles sbp ON sbp.seller_id=svc.seller_id JOIN users u ON u.id=svc.seller_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY ${VERIFICATION_SORT_COLUMNS[query.sort]} ${query.direction === "asc" ? "ASC" : "DESC"} NULLS LAST,svc.id
      LIMIT ${limit} OFFSET ${offset}`,
    values,
  );
  const total = Number(result.rows[0]?.total_count ?? 0);
  const metadata = await pool.query("SELECT array_agg(DISTINCT status ORDER BY status) AS statuses,array_agg(DISTINCT country ORDER BY country) AS countries,array_agg(DISTINCT entity_type ORDER BY entity_type) AS entity_types FROM seller_verification_cases");
  return {
    cases: result.rows.map((item: Record<string, any>) => ({
      id: item.id,
      sellerId: item.seller_id,
      sellerName: item.seller_name,
      sellerEmail: item.seller_email ?? null,
      legalName: item.legal_name,
      status: item.status,
      country: item.country,
      entityType: item.entity_type,
      submittedAt: iso(item.submitted_at),
      updatedAt: iso(item.updated_at)!,
      accountStatus: item.account_status,
    })),
    pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) },
    filters: {
      statuses: metadata.rows[0]?.statuses ?? [],
      countries: metadata.rows[0]?.countries ?? [],
      entityTypes: metadata.rows[0]?.entity_types ?? [],
    },
    generatedAt: new Date().toISOString(),
  };
}
