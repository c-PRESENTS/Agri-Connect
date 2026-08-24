import type { PoolClient } from "pg";
import type { AdminCatalogCategory, Category } from "@shared/schema";
import { pool } from "../config/db";

type Queryable = Pick<PoolClient, "query">;

const categorySelect = `
  SELECT c.*,
    (SELECT count(*)::int FROM catalog_categories child WHERE child.parent_id=c.id) AS child_count,
    (SELECT count(*)::int FROM commerce_products p WHERE p.category_id=c.canonical_id OR p.subcategory_id=c.canonical_id) AS reference_count
  FROM catalog_categories c`;

function iso(value: unknown): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function mapAdminCategory(row: Record<string, any>): AdminCatalogCategory {
  return {
    id: row.id,
    canonicalId: row.canonical_id,
    parentId: row.parent_id ?? null,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    imageUrl: row.image_url ?? null,
    buyerVisible: row.buyer_visible,
    sellerOnly: row.seller_only,
    status: row.status,
    displayOrder: row.display_order,
    translations: row.translations ?? {},
    content: row.content ?? {},
    version: row.version,
    referenceCount: row.reference_count ?? 0,
    childCount: row.child_count ?? 0,
    createdBy: row.created_by ?? null,
    reviewedBy: row.reviewed_by ?? null,
    publishedBy: row.published_by ?? null,
    submittedAt: iso(row.submitted_at),
    reviewedAt: iso(row.reviewed_at),
    publishedAt: iso(row.published_at),
    archivedAt: iso(row.archived_at),
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
  };
}

export async function ensureCanonicalTaxonomyImported(categories: Category[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('agriconnect-catalog-taxonomy-v1'))");
    await client.query(
      `UPDATE catalog_categories
          SET image_url = CASE
                WHEN image_url = '/category-logos/' || canonical_id || '.svg' THEN NULL
                ELSE image_url
              END,
              published_data = CASE
                WHEN published_data->>'imageUrl' = '/category-logos/' || canonical_id || '.svg'
                  THEN jsonb_set(published_data, '{imageUrl}', 'null'::jsonb, true)
                ELSE published_data
              END,
              updated_at = now()
        WHERE parent_id IS NOT NULL
          AND content->>'importedFrom' = 'legacy-static-taxonomy'
          AND (
            image_url = '/category-logos/' || canonical_id || '.svg'
            OR published_data->>'imageUrl' = '/category-logos/' || canonical_id || '.svg'
          )`,
    );
    const imported = await client.query("SELECT 1 FROM catalog_taxonomy_imports WHERE import_key='canonical-v2'");
    if (imported.rowCount) {
      await client.query("COMMIT");
      return;
    }

    let rowCount = 0;
    for (let rootOrder = 0; rootOrder < categories.length; rootOrder += 1) {
      const category = categories[rootOrder];
      await client.query(
        `INSERT INTO catalog_categories
          (id,canonical_id,parent_id,name,slug,icon,image_url,buyer_visible,seller_only,status,display_order,content,published_data,published_at,created_at,updated_at)
         VALUES ($1,$1,NULL,$2,$3,$4,$5,$6,$7,'published',$8,$9,$10,now(),now(),now())
         ON CONFLICT (id) DO UPDATE SET canonical_id=EXCLUDED.canonical_id,published_data=COALESCE(catalog_categories.published_data,EXCLUDED.published_data)`,
        [
          category.id,
          category.name,
          category.id,
          category.icon,
          `/category-logos/${category.id}.svg`,
          category.buyerVisible !== false,
          category.sellerOnly === true,
          rootOrder,
          JSON.stringify({ importedFrom: "legacy-static-taxonomy" }),
          JSON.stringify({ parentId: null, name: category.name, icon: category.icon, imageUrl: `/category-logos/${category.id}.svg`, buyerVisible: category.buyerVisible !== false, sellerOnly: category.sellerOnly === true, displayOrder: rootOrder }),
        ],
      );
      rowCount += 1;
    }
    const rootIds = new Set(categories.map((category) => category.id));
    const allocatedIds = new Set(rootIds);
    for (const category of categories) {
      for (let childOrder = 0; childOrder < category.subcategories.length; childOrder += 1) {
        const subcategory = category.subcategories[childOrder];
        const isAlias = allocatedIds.has(subcategory.id);
        const internalId = isAlias ? `${category.id}--${subcategory.id}` : subcategory.id;
        allocatedIds.add(internalId);
        await client.query(
          `INSERT INTO catalog_categories
            (id,canonical_id,parent_id,name,slug,icon,image_url,buyer_visible,seller_only,status,display_order,content,published_data,published_at,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,'Leaf',$6,$7,$8,'published',$9,$10,$11,now(),now(),now())
           ON CONFLICT (id) DO UPDATE SET canonical_id=EXCLUDED.canonical_id,published_data=COALESCE(catalog_categories.published_data,EXCLUDED.published_data)`,
          [
            internalId,
            subcategory.id,
            category.id,
            subcategory.name,
            isAlias ? `${category.id}-${subcategory.id}` : subcategory.id,
            null,
            category.buyerVisible !== false && subcategory.buyerVisible !== false,
            category.sellerOnly === true,
            childOrder,
            JSON.stringify({ importedFrom: "legacy-static-taxonomy", ...(isAlias ? { aliasOf: subcategory.id } : {}) }),
            JSON.stringify({ parentId: category.id, name: subcategory.name, icon: "Leaf", imageUrl: null, buyerVisible: category.buyerVisible !== false && subcategory.buyerVisible !== false, sellerOnly: category.sellerOnly === true, displayOrder: childOrder }),
          ],
        );
        rowCount += 1;
      }
    }
    await client.query(
      `INSERT INTO catalog_taxonomy_imports(import_key,row_count) VALUES ('canonical-v2',$1)`,
      [rowCount],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listPublishedTaxonomy(audience: "buyer" | "seller" = "buyer"): Promise<Category[]> {
  const result = await pool.query(
    `SELECT id,canonical_id,
            NULLIF(published_data->>'parentId','') AS parent_id,
            published_data->>'name' AS name,
            COALESCE(published_data->>'icon','Leaf') AS icon,
            published_data->>'imageUrl' AS image_url,
            COALESCE((published_data->>'buyerVisible')::boolean,true) AS buyer_visible,
            COALESCE((published_data->>'sellerOnly')::boolean,false) AS seller_only,
            COALESCE((published_data->>'displayOrder')::int,display_order) AS display_order
       FROM catalog_categories
      WHERE published_data IS NOT NULL AND archived_at IS NULL
        AND ($1::boolean OR COALESCE((published_data->>'buyerVisible')::boolean,true)=true)
      ORDER BY parent_id NULLS FIRST,display_order,id`,
    [audience === "seller"],
  );
  const roots = new Map<string, Category>();
  for (const row of result.rows as Record<string, any>[]) {
    if (row.parent_id === null) {
      roots.set(row.id, {
        id: row.canonical_id,
        name: row.name,
        icon: row.icon,
        imageUrl: row.image_url ?? undefined,
        buyerVisible: row.buyer_visible,
        sellerOnly: row.seller_only,
        subcategories: [],
      });
    }
  }
  for (const row of result.rows as Record<string, any>[]) {
    if (row.parent_id === null) continue;
    const parent = roots.get(row.parent_id);
    if (!parent) continue;
    parent.subcategories.push({ id: row.canonical_id, name: row.name, parentId: parent.id, buyerVisible: row.buyer_visible, imageUrl: row.image_url ?? undefined });
  }
  return Array.from(roots.values());
}

export async function listAdminCategories(includeDrafts: boolean): Promise<AdminCatalogCategory[]> {
  const result = await pool.query(
    `${categorySelect} ${includeDrafts ? "" : "WHERE c.published_data IS NOT NULL AND c.archived_at IS NULL"}
     ORDER BY c.parent_id NULLS FIRST,c.display_order,c.id`,
  );
  return result.rows.map(mapAdminCategory);
}

export async function getAdminCategory(id: string, queryable: Queryable = pool): Promise<AdminCatalogCategory | null> {
  const result = await queryable.query(`${categorySelect} WHERE c.id=$1 LIMIT 1`, [id]);
  return result.rowCount ? mapAdminCategory(result.rows[0]) : null;
}

export async function getCategoryEvents(id: string): Promise<Array<Record<string, unknown>>> {
  const result = await pool.query(
    `SELECT e.id,e.event_type AS "eventType",e.from_status AS "fromStatus",e.to_status AS "toStatus",
            e.reason,e.version,e.created_at AS "createdAt",u.name AS "actorName"
       FROM catalog_category_events e LEFT JOIN users u ON u.id=e.actor_id
      WHERE e.category_id=$1 ORDER BY e.created_at DESC,e.id DESC LIMIT 100`,
    [id],
  );
  return result.rows.map((row: Record<string, any>) => ({ ...row, createdAt: iso(row.createdAt) }));
}

export const adminCategoryRepository = {
  listAdminCategories,
  getAdminCategory,
  getCategoryEvents,
};
