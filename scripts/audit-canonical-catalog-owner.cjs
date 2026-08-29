const { Client } = require("pg");

const ownerEmail = (process.env.MVP_CATALOG_OWNER_EMAIL || "harsh.gavand.tech@gmail.com")
  .trim()
  .toLowerCase();

const legacyIds = [
  "farmer-1", "farmer-2", "farmer-3", "farmer-4", "farmer-5",
  "farmer-6", "farmer-7", "farmer-8", "farmer-9", "farmer-10",
  "user-highland-estates", "user-cotswold-dairy", "user-somerset-orchards",
  "user-yorkshire-grains", "user-kent-berries", "user-devon-pasture",
];

const legacyNames = [
  "James Wilson", "Sarah Thompson", "Michael Brown", "Emma Davies", "Thomas Green",
  "Lucy Mitchell", "William Taylor", "Sophie Adams", "Oliver White", "Charlotte Evans",
  "Raj Kumar", "Priya Sharma", "Amit Patel", "Sunita Devi", "Ravi Singh",
  "Lakshmi Reddy", "Mohammed Ali", "Geeta Yadav", "Suresh Nair", "Anita Kumari",
  "Highland Moorland Estates", "Cotswold Valley Dairy Co-op", "Somerset Heritage Orchards",
  "Yorkshire Arable & Grain Producers", "Kent Berry & Soft Fruits", "Devon Pasture & Livestock",
];

const legacyShareCareIds = Array.from({ length: 15 }, (_, index) => `sc-${index + 1}`);
const legacyShareCareNames = [
  "Rachel Green", "Tom Hart", "Anna Bell", "Liam Walker", "Sue Moore",
  "Paul Evans", "Claire James", "Mark Singh", "Fiona Black", "George Ali",
  "Priya Shah", "David Owen", "Holt Bakery", "Hartley Farm", "Dales Dairy",
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const ownerResult = await client.query(
      `SELECT id,email,name,role,seller_enabled,account_status,location,latitude,longitude,
              rating,review_count,is_online
         FROM users
        WHERE lower(email)=lower($1)`,
      [ownerEmail],
    );
    if (ownerResult.rowCount !== 1) {
      throw new Error(`Expected exactly one canonical owner for ${ownerEmail}; found ${ownerResult.rowCount}`);
    }
    const owner = ownerResult.rows[0];
    const ownerId = owner.id;

    const checks = {
      productsNotOwnedByCanonicalSeller: `SELECT count(*)::int AS count FROM commerce_products WHERE farmer_id<>$1`,
      productSnapshotsWithWrongSeller: `SELECT count(*)::int AS count FROM commerce_products WHERE product_data->>'farmerId' IS DISTINCT FROM $1`,
      productSnapshotsWithWrongName: `SELECT count(*)::int AS count FROM commerce_products WHERE product_data->>'farmerName' IS DISTINCT FROM (SELECT COALESCE(NULLIF(name,''),NULLIF(concat_ws(' ',first_name,last_name),''),email) FROM users WHERE id=$1)`,
      orderItemsWithWrongSeller: `SELECT count(*)::int AS count FROM commerce_order_items WHERE seller_id<>$1`,
      orderItemSnapshotsWithWrongSeller: `SELECT count(*)::int AS count FROM commerce_order_items WHERE item_data->>'farmerId' IS DISTINCT FROM $1`,
      orderItemSnapshotsWithWrongName: `SELECT count(*)::int AS count FROM commerce_order_items WHERE item_data->>'farmerName' IS DISTINCT FROM (SELECT COALESCE(NULLIF(name,''),NULLIF(concat_ws(' ',first_name,last_name),''),email) FROM users WHERE id=$1)`,
      conversationsWithWrongSeller: `SELECT count(*)::int AS count FROM marketplace_conversations WHERE seller_id<>$1`,
      allocationsWithWrongSeller: `SELECT count(*)::int AS count FROM protected_allocations WHERE seller_id<>$1`,
      cashPreferencesWithWrongSeller: `SELECT count(*)::int AS count FROM seller_cash_preferences WHERE seller_id<>$1`,
      paymentAccountsWithWrongSeller: `SELECT count(*)::int AS count FROM seller_payment_accounts WHERE seller_id<>$1`,
      regionAssignmentsWithWrongSeller: `SELECT count(*)::int AS count FROM seller_region_assignments WHERE seller_id<>$1`,
      businessProfilesWithWrongSeller: `SELECT count(*)::int AS count FROM seller_business_profiles WHERE seller_id<>$1`,
      verificationCasesWithWrongSeller: `SELECT count(*)::int AS count FROM seller_verification_cases WHERE seller_id<>$1`,
      taxIdentifiersWithWrongSeller: `SELECT count(*)::int AS count FROM seller_tax_identifiers WHERE seller_id<>$1`,
      associatedPersonsWithWrongSeller: `SELECT count(*)::int AS count FROM seller_associated_persons WHERE seller_id<>$1`,
      verificationDocumentsWithWrongSeller: `SELECT count(*)::int AS count FROM seller_verification_documents WHERE seller_id<>$1`,
      legacyShareCareListingsWithWrongDonor: `SELECT count(*)::int AS count FROM share_care_listings WHERE id=ANY($2::varchar[]) AND donor_id IS DISTINCT FROM $1`,
      legacyShareCareListingsWithWrongName: `SELECT count(*)::int AS count FROM share_care_listings WHERE id=ANY($2::varchar[]) AND donor_name IS DISTINCT FROM (SELECT COALESCE(NULLIF(trim(name),''),NULLIF(trim(concat_ws(' ',first_name,last_name)),''),email) FROM users WHERE id=$1)`,
      legacyShareCareListingsWithWrongLocation: `SELECT count(*)::int AS count FROM share_care_listings WHERE id=ANY($2::varchar[]) AND (location IS DISTINCT FROM (SELECT location FROM users WHERE id=$1) OR latitude IS DISTINCT FROM (SELECT latitude::double precision FROM users WHERE id=$1) OR longitude IS DISTINCT FROM (SELECT longitude::double precision FROM users WHERE id=$1))`,
      orphanVisibleShareCareListings: `SELECT count(*)::int AS count FROM share_care_listings WHERE donor_id IS NULL AND status='available' AND expires_at>now()`,
      legacyShareCareNames: `SELECT count(*)::int AS count FROM share_care_listings WHERE donor_name=ANY($1::text[])`,
      legacyUsers: `SELECT count(*)::int AS count FROM users WHERE id=ANY($1::varchar[]) OR auth_method='catalog_seed'`,
      legacySellerReferencesInOrders: `SELECT count(*)::int AS count FROM commerce_orders item WHERE EXISTS (SELECT 1 FROM unnest($1::varchar[]) legacy(value) WHERE item.order_data::text LIKE '%' || legacy.value || '%')`,
      legacySellerReferencesInQuotes: `SELECT count(*)::int AS count FROM checkout_quotes item WHERE EXISTS (SELECT 1 FROM unnest($1::varchar[]) legacy(value) WHERE item.quote_data::text LIKE '%' || legacy.value || '%')`,
      legacySellerReferencesInAudit: `SELECT count(*)::int AS count FROM admin_audit_events item WHERE item.target_id=ANY($1::varchar[]) OR EXISTS (SELECT 1 FROM unnest($1::varchar[]) legacy(value) WHERE item.changes::text LIKE '%' || legacy.value || '%' OR item.metadata::text LIKE '%' || legacy.value || '%')`,
      legacySellerReferencesInMessages: `SELECT count(*)::int AS count FROM marketplace_conversation_messages WHERE sender_id=ANY($1::varchar[])`,
      legacySellerReferencesInOpportunities: `SELECT count(*)::int AS count FROM regional_product_opportunities WHERE claimed_by=ANY($1::varchar[])`,
      legacySellerReferencesInNotifications: `SELECT count(*)::int AS count FROM marketplace_notifications WHERE user_id=ANY($1::varchar[])`,
      legacySellerReferencesInAdminNotes: `SELECT count(*)::int AS count FROM admin_user_notes WHERE subject_user_id=ANY($1::varchar[]) OR author_user_id=ANY($1::varchar[])`,
      legacySellerNamesInProducts: `SELECT count(*)::int AS count FROM commerce_products WHERE product_data->>'farmerName'=ANY($1::text[])`,
      legacySellerNamesInOrders: `SELECT count(*)::int AS count FROM commerce_orders WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(order_data->'items','[]'::jsonb)) item WHERE item->>'farmerName'=ANY($1::text[]))`,
      legacySellerNamesInQuotes: `SELECT count(*)::int AS count FROM checkout_quotes WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(quote_data->'items','[]'::jsonb)) item WHERE item->>'farmerName'=ANY($1::text[]))`,
      legacySeedAuditRows: `SELECT count(*)::int AS count FROM admin_audit_events WHERE id=ANY($1::varchar[])`,
    };

    const failures = {};
    for (const [name, sql] of Object.entries(checks)) {
      const params = name.startsWith("legacyShareCareListings")
        ? [ownerId, legacyShareCareIds]
        : name === "legacyShareCareNames"
          ? [legacyShareCareNames]
        : name === "orphanVisibleShareCareListings"
          ? []
        : name === "legacySeedAuditRows"
        ? [["ae-seed-001", "ae-seed-002", "ae-seed-003", "ae-seed-004", "ae-seed-005", "ae-seed-006"]]
        : name.startsWith("legacySellerNames")
          ? [legacyNames]
        : name.startsWith("legacy")
          ? [legacyIds]
          : [ownerId];
      const result = await client.query(sql, params);
      failures[name] = Number(result.rows[0]?.count || 0);
    }

    const totalsResult = await client.query(
      `SELECT
         (SELECT count(*)::int FROM commerce_products) AS products,
         (SELECT count(*)::int FROM commerce_products WHERE moderation_status='approved') AS approved_products,
         (SELECT count(*)::int FROM commerce_order_items) AS order_items,
         (SELECT count(DISTINCT order_id)::int FROM commerce_order_items) AS seller_orders,
         (SELECT count(*)::int FROM protected_allocations) AS allocations,
         (SELECT count(*)::int FROM seller_region_assignments WHERE seller_id=$1 AND status='active' AND can_publish=true) AS active_regions,
         (SELECT count(*)::int FROM seller_verification_cases WHERE seller_id=$1 AND status='verified' AND (expires_at IS NULL OR expires_at>now())) AS valid_verifications,
         (SELECT count(*)::int FROM share_care_listings WHERE donor_id=$1) AS share_care_listings,
         (SELECT count(*)::int FROM share_care_listings WHERE donor_id=$1 AND status='available' AND expires_at>now()) AS active_share_care_listings`,
      [ownerId],
    );

    const report = { owner, totals: totalsResult.rows[0], failures };
    console.log(JSON.stringify(report, null, 2));
    const nonZero = Object.entries(failures).filter(([, count]) => count !== 0);
    if (nonZero.length > 0) {
      throw new Error(`Canonical seller audit failed: ${nonZero.map(([name, count]) => `${name}=${count}`).join(", ")}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
