import type { PoolClient } from "pg";
import { randomUUID } from "crypto";
import type {
  AdminAccessContext,
  AdminCatalogCategory,
  CategoryLifecycleStatus,
  CategoryTransitionInput,
  CreateCatalogCategoryInput,
  ReorderCatalogCategoriesInput,
  UpdateCatalogCategoryInput,
} from "@shared/schema";
import { pool } from "../config/db";
import { getAdminCategory } from "./admin-category-repository";

export interface CategoryActor {
  userId: string;
  access: AdminAccessContext;
  requestId: string | null;
}

export class CategoryManagementError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function lockCategory(client: PoolClient, id: string): Promise<Record<string, any>> {
  const result = await client.query("SELECT * FROM catalog_categories WHERE id=$1 FOR UPDATE", [id]);
  if (!result.rowCount) throw new CategoryManagementError(404, "CATEGORY_NOT_FOUND", "Category not found.");
  return result.rows[0];
}

function assertVersion(row: Record<string, any>, expectedVersion: number) {
  if (row.version !== expectedVersion) {
    throw new CategoryManagementError(409, "CATEGORY_VERSION_CONFLICT", "This category changed after it was loaded. Refresh and try again.");
  }
}

async function ensureParent(client: PoolClient, parentId: string | null | undefined, selfId?: string) {
  if (!parentId) return;
  if (parentId === selfId) throw new CategoryManagementError(422, "CATEGORY_HIERARCHY_CYCLE", "A category cannot be its own parent.");
  const parent = await client.query("SELECT id,parent_id,status FROM catalog_categories WHERE id=$1", [parentId]);
  if (!parent.rowCount) throw new CategoryManagementError(422, "CATEGORY_PARENT_NOT_FOUND", "The selected parent does not exist.");
  if (selfId) {
    const cycle = await client.query(
      `WITH RECURSIVE descendants AS (
         SELECT id FROM catalog_categories WHERE parent_id=$1
         UNION ALL SELECT c.id FROM catalog_categories c JOIN descendants d ON c.parent_id=d.id
       ) SELECT 1 FROM descendants WHERE id=$2 LIMIT 1`,
      [selfId, parentId],
    );
    if (cycle.rowCount) throw new CategoryManagementError(422, "CATEGORY_HIERARCHY_CYCLE", "That parent would create a hierarchy cycle.");
  }
}

async function event(
  client: PoolClient,
  categoryId: string,
  actor: CategoryActor,
  eventType: string,
  version: number,
  fromStatus: CategoryLifecycleStatus | null,
  toStatus: CategoryLifecycleStatus | null,
  reason?: string,
) {
  const snapshot = await client.query("SELECT * FROM catalog_categories WHERE id=$1", [categoryId]);
  await client.query(
    `INSERT INTO catalog_category_versions(category_id,version,lifecycle_status,data,created_by)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT (category_id,version) DO NOTHING`,
    [categoryId, version, toStatus ?? fromStatus ?? "draft", JSON.stringify(snapshot.rows[0] ?? {}), actor.userId],
  );
  await client.query(
    `INSERT INTO catalog_category_events(category_id,actor_id,event_type,from_status,to_status,reason,snapshot,version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [categoryId, actor.userId, eventType, fromStatus, toStatus, reason ?? null, JSON.stringify(snapshot.rows[0] ?? {}), version],
  );
  await client.query(
    `INSERT INTO admin_audit_events
      (organisation_id,actor_user_id,membership_id,action,permission_code,target_type,target_id,request_id,changes,metadata)
     VALUES ($1,$2,$3,$4,$5,'category',$6,$7,$8,$9)`,
    [
      actor.access.organisation?.id ?? null,
      actor.userId,
      actor.access.membership?.id ?? null,
      `admin.category_${eventType}`,
      eventType === "created" ? "categories.create" : eventType === "reordered" ? "categories.reorder" : eventType === "published" ? "categories.publish" : eventType === "archived" ? "categories.archive" : "categories.edit",
      categoryId,
      actor.requestId,
      JSON.stringify({ status: { from: fromStatus, to: toStatus }, version }),
      JSON.stringify({ reason: reason ?? null }),
    ],
  );
}

async function result(client: PoolClient, id: string): Promise<AdminCatalogCategory> {
  return (await getAdminCategory(id, client))!;
}

export async function createCategory(actor: CategoryActor, input: CreateCatalogCategoryInput): Promise<AdminCatalogCategory> {
  return transaction(async (client) => {
    await ensureParent(client, input.parentId);
    const order = await client.query(
      "SELECT COALESCE(max(display_order),-1)+1 AS next_order FROM catalog_categories WHERE parent_id IS NOT DISTINCT FROM $1",
      [input.parentId],
    );
    let created;
    const id = randomUUID();
    try {
      created = await client.query(
        `INSERT INTO catalog_categories
          (id,canonical_id,parent_id,name,slug,icon,image_url,buyer_visible,seller_only,status,display_order,translations,content,created_by)
         VALUES ($1,$1,$2,$3,$4,$5,$6,$7,$8,'draft',$9,$10,$11,$12) RETURNING id,version`,
        [id, input.parentId, input.name, input.slug, input.icon, input.imageUrl || null, input.buyerVisible, input.sellerOnly, order.rows[0].next_order, JSON.stringify(input.translations), JSON.stringify(input.content), actor.userId],
      );
    } catch (error: any) {
      if (error?.code === "23505") throw new CategoryManagementError(409, "CATEGORY_SLUG_CONFLICT", "That category slug is already in use.");
      throw error;
    }
    await event(client, created.rows[0].id, actor, "created", created.rows[0].version, null, "draft");
    return result(client, created.rows[0].id);
  });
}

export async function updateCategory(id: string, actor: CategoryActor, input: UpdateCatalogCategoryInput): Promise<AdminCatalogCategory> {
  return transaction(async (client) => {
    const current = await lockCategory(client, id);
    assertVersion(current, input.expectedVersion);
    if (current.status === "archived") throw new CategoryManagementError(409, "CATEGORY_ARCHIVED", "Archived categories cannot be edited.");
    if (current.status === "pending_review") throw new CategoryManagementError(409, "CATEGORY_PENDING_REVIEW", "Request changes before editing a category under review.");
    await ensureParent(client, input.parentId, id);
    const fields: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, value: unknown) => { values.push(value); fields.push(`${column}=$${values.length}`); };
    for (const [key, column] of Object.entries({ parentId: "parent_id", name: "name", slug: "slug", icon: "icon", imageUrl: "image_url", buyerVisible: "buyer_visible", sellerOnly: "seller_only", translations: "translations", content: "content" })) {
      const value = (input as any)[key];
      if (value !== undefined) add(column, key === "translations" || key === "content" ? JSON.stringify(value) : value || null);
    }
    values.push(id);
    try {
      const updated = await client.query(
        `UPDATE catalog_categories SET ${fields.join(",")},status=CASE WHEN status='published' THEN 'draft' ELSE status END,version=version+1,updated_at=now() WHERE id=$${values.length} RETURNING version,status`,
        values,
      );
      await event(client, id, actor, "edited", updated.rows[0].version, current.status, updated.rows[0].status);
    } catch (error: any) {
      if (error?.code === "23505") throw new CategoryManagementError(409, "CATEGORY_SLUG_CONFLICT", "That category slug is already in use.");
      if (error?.code === "23514") throw new CategoryManagementError(422, "CATEGORY_HIERARCHY_CYCLE", "That parent would create a hierarchy cycle.");
      throw error;
    }
    return result(client, id);
  });
}

const transitions: Record<string, { from: CategoryLifecycleStatus[]; to: CategoryLifecycleStatus }> = {
  submit: { from: ["draft"], to: "pending_review" },
  publish: { from: ["pending_review"], to: "published" },
  "request-changes": { from: ["pending_review"], to: "draft" },
  archive: { from: ["published"], to: "archived" },
};

export async function transitionCategory(id: string, action: keyof typeof transitions, actor: CategoryActor, input: CategoryTransitionInput): Promise<AdminCatalogCategory> {
  return transaction(async (client) => {
    const current = await lockCategory(client, id);
    assertVersion(current, input.expectedVersion);
    const transition = transitions[action];
    if (!transition.from.includes(current.status)) {
      throw new CategoryManagementError(409, "CATEGORY_INVALID_TRANSITION", `A ${current.status} category cannot be ${action.replace("-", " ")}.`);
    }
    if (action === "publish" && current.parent_id) {
      const parent = await client.query("SELECT published_data,archived_at FROM catalog_categories WHERE id=$1", [current.parent_id]);
      if (!parent.rows[0]?.published_data || parent.rows[0]?.archived_at) throw new CategoryManagementError(422, "CATEGORY_PARENT_NOT_PUBLISHED", "Publish the parent category first.");
    }
    if (action === "archive") {
      const impact = await client.query(
        `SELECT
          (SELECT count(*)::int FROM commerce_products WHERE category_id=$2 OR subcategory_id=$2) AS references,
          (SELECT count(*)::int FROM catalog_categories WHERE parent_id=$1 AND status<>'archived') AS active_children,
          (SELECT count(*)::int FROM catalog_categories WHERE canonical_id=$2 AND id<>$1 AND published_data IS NOT NULL AND archived_at IS NULL) AS published_aliases`,
        [id, current.canonical_id],
      );
      if (impact.rows[0].references > 0) throw new CategoryManagementError(422, "CATEGORY_REFERENCED", "Reassign referenced products before archiving this category.");
      if (impact.rows[0].active_children > 0) throw new CategoryManagementError(422, "CATEGORY_HAS_ACTIVE_CHILDREN", "Archive or reassign every child category first.");
      if (impact.rows[0].published_aliases > 0) throw new CategoryManagementError(422, "CATEGORY_HAS_PUBLISHED_ALIASES", "Archive every published navigation alias for this canonical category first.");
    }
    const updated = await client.query(
      `UPDATE catalog_categories SET
         status=$2,
         submitted_at=CASE WHEN $5='submit' THEN now() ELSE submitted_at END,
         reviewed_at=CASE WHEN $5 IN ('publish','request-changes') THEN now() ELSE reviewed_at END,
         reviewed_by=CASE WHEN $5 IN ('publish','request-changes') THEN $4 ELSE reviewed_by END,
         published_at=CASE WHEN $5='publish' THEN now() ELSE published_at END,
         published_by=CASE WHEN $5='publish' THEN $4 ELSE published_by END,
         archived_at=CASE WHEN $5='archive' THEN now() WHEN $5='publish' THEN NULL ELSE archived_at END,
         published_data=CASE WHEN $5='publish' THEN jsonb_build_object(
           'parentId',parent_id,'name',name,'icon',icon,'imageUrl',image_url,
           'buyerVisible',buyer_visible,'sellerOnly',seller_only,'displayOrder',display_order,
           'translations',translations,'content',content
         ) ELSE published_data END,
         version=version+1,
         updated_at=now()
       WHERE id=$1 AND version=$3 RETURNING version`,
      [id, transition.to, input.expectedVersion, actor.userId, action],
    );
    await event(client, id, actor, action === "request-changes" ? "changes_requested" : action === "submit" ? "submitted" : action === "publish" ? "published" : "archived", updated.rows[0].version, current.status, transition.to, input.reason);
    return result(client, id);
  });
}

export async function reorderCategories(actor: CategoryActor, input: ReorderCatalogCategoriesInput): Promise<AdminCatalogCategory[]> {
  return transaction(async (client) => {
    const siblings = await client.query(
      "SELECT id,version,status FROM catalog_categories WHERE parent_id IS NOT DISTINCT FROM $1 ORDER BY id FOR UPDATE",
      [input.parentId],
    );
    const actual = siblings.rows.map((row: any) => row.id).sort();
    const requested = [...input.orderedIds].sort();
    if (actual.length !== requested.length || actual.some((id: string, index: number) => id !== requested[index])) {
      throw new CategoryManagementError(422, "CATEGORY_REORDER_INCOMPLETE", "Submit the complete set of sibling categories exactly once.");
    }
    for (let displayOrder = 0; displayOrder < input.orderedIds.length; displayOrder += 1) {
      const id = input.orderedIds[displayOrder];
      const row = siblings.rows.find((candidate: any) => candidate.id === id);
      assertVersion(row, input.expectedVersions[id]);
      const updated = await client.query("UPDATE catalog_categories SET display_order=$2,published_data=CASE WHEN status='published' THEN jsonb_set(published_data,'{displayOrder}',to_jsonb($2::int),true) ELSE published_data END,version=version+1,updated_at=now() WHERE id=$1 RETURNING version,status", [id, displayOrder]);
      await event(client, id, actor, "reordered", updated.rows[0].version, row.status, updated.rows[0].status);
    }
    const resultRows: AdminCatalogCategory[] = [];
    for (const id of input.orderedIds) resultRows.push(await result(client, id));
    return resultRows;
  });
}
