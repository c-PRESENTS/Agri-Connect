/// <reference types="node" />
import { randomUUID } from "crypto";
import { expect, test } from "@playwright/test";
import {
  createCatalogCategorySchema,
  reorderCatalogCategoriesSchema,
} from "../../shared/models/catalog-categories";
import { visibleAdminNavigation } from "../../frontend/src/lib/admin-navigation";

test.describe("organisation admin portal Phase 5", () => {
  test("validates category inputs, complete ordering, and permission-aware navigation", () => {
    expect(createCatalogCategorySchema.parse({ name: "Farm Supplies", slug: "farm-supplies" })).toMatchObject({ name: "Farm Supplies", slug: "farm-supplies", parentId: null });
    expect(() => createCatalogCategorySchema.parse({ name: "A", slug: "Not Valid" })).toThrow();
    expect(() => createCatalogCategorySchema.parse({ name: "Valid name", slug: "valid-name", imageUrl: "http://insecure.example/image.png" })).toThrow();
    expect(() => reorderCatalogCategoriesSchema.parse({ parentId: null, orderedIds: ["one", "one"], expectedVersions: { one: 1 } })).toThrow();
    expect(() => reorderCatalogCategoriesSchema.parse({ parentId: null, orderedIds: ["one", "two"], expectedVersions: { one: 1 } })).toThrow();
    expect(visibleAdminNavigation(["categories.view"]).map((item) => item.path)).toEqual(["/admin/categories"]);
  });

  test("requires authentication for every Phase 5 admin API and UI route", async ({ page, request }) => {
    const id = randomUUID();
    const responses = await Promise.all([
      request.get("/api/admin/categories?includeDrafts=true"),
      request.get(`/api/admin/categories/${id}`),
      request.post("/api/admin/categories", { data: {} }),
      request.patch(`/api/admin/categories/${id}`, { data: {} }),
      request.post(`/api/admin/categories/${id}/submit`, { data: {} }),
      request.post(`/api/admin/categories/${id}/publish`, { data: {} }),
      request.post(`/api/admin/categories/${id}/request-changes`, { data: {} }),
      request.post(`/api/admin/categories/${id}/archive`, { data: {} }),
      request.post("/api/admin/categories/reorder", { data: {} }),
    ]);
    for (const response of responses) expect(response.status()).toBe(401);
    await page.goto("/admin/categories");
    await expect(page).toHaveURL(/\/admin\/sign-in\?returnTo=%2Fadmin%2Fcategories/);
  });

  test("imports the legacy taxonomy once with stable IDs and published parity", async () => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for live Phase 5 parity verification");
    const [{ pool }, storageModule, categoriesRepository] = await Promise.all([
      import("../../backend/config/db"),
      import("../../backend/storage"),
      import("../../backend/organisations/admin-category-repository"),
    ]);
    await categoriesRepository.ensureCanonicalTaxonomyImported(storageModule.categoriesData);
    const expectedCount = storageModule.categoriesData.reduce((count, category) => count + 1 + category.subcategories.length, 0);
    const importRow = await pool.query("SELECT row_count FROM catalog_taxonomy_imports WHERE import_key='canonical-v2'");
    const actual = await pool.query("SELECT count(*)::int AS count FROM catalog_categories WHERE content->>'importedFrom'='legacy-static-taxonomy'");
    const invalidImportedImages = await pool.query(
      `SELECT count(*)::int AS count
         FROM catalog_categories
        WHERE parent_id IS NOT NULL
          AND content->>'importedFrom'='legacy-static-taxonomy'
          AND (
            image_url = '/category-logos/' || canonical_id || '.svg'
            OR published_data->>'imageUrl' = '/category-logos/' || canonical_id || '.svg'
          )`,
    );
    expect(importRow.rows[0].row_count).toBe(expectedCount);
    expect(actual.rows[0].count).toBe(expectedCount);
    expect(invalidImportedImages.rows[0].count).toBe(0);
    const published = await categoriesRepository.listPublishedTaxonomy("seller");
    expect(published.map((category) => category.id)).toEqual(storageModule.categoriesData.map((category) => category.id));
    for (const category of storageModule.categoriesData) {
      expect(published.find((candidate) => candidate.id === category.id)?.subcategories.map((subcategory) => subcategory.id)).toEqual(category.subcategories.map((subcategory) => subcategory.id));
    }
  });

  test("enforces draft review publish archive hierarchy and reference rules transactionally", async () => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for live Phase 5 transaction verification");
    const [{ pool }, service, repository, storageModule] = await Promise.all([
      import("../../backend/config/db"),
      import("../../backend/organisations/admin-category-service"),
      import("../../backend/organisations/admin-category-repository"),
      import("../../backend/storage"),
    ]);
    await repository.ensureCanonicalTaxonomyImported(storageModule.categoriesData);
    const actorId = randomUUID();
    const suffix = randomUUID().slice(0, 8);
    const productId = `phase5-${randomUUID()}`;
    const actor = {
      userId: actorId,
      requestId: "phase-5-test",
      access: { hasAccess: true, organisation: { id: "agriconnect-platform", name: "AgriConnect", slug: "agriconnect", type: "platform", status: "approved" }, membership: null, role: null, permissions: ["categories.view", "categories.create", "categories.edit", "categories.reorder", "categories.publish", "categories.archive"] as any },
    };
    const createdIds: string[] = [];
    try {
      await pool.query("INSERT INTO users(id,email,auth_method,role,name,profile_complete,account_status) VALUES ($1,$2,'password','admin','Phase 5 Reviewer',true,'active')", [actorId, `${actorId}@example.invalid`]);
      const root = await service.createCategory(actor, { parentId: null, name: `Phase 5 Root ${suffix}`, slug: `phase-5-root-${suffix}`, icon: "Leaf", imageUrl: "/category-logos/fresh-produce.svg", buyerVisible: true, sellerOnly: false, translations: {}, content: { description: "Lifecycle test" } });
      createdIds.push(root.id);
      expect((await repository.listPublishedTaxonomy("buyer")).some((category) => category.id === root.id)).toBe(false);
      const pendingRoot = await service.transitionCategory(root.id, "submit", actor, { expectedVersion: root.version });
      const publishedRoot = await service.transitionCategory(root.id, "publish", actor, { expectedVersion: pendingRoot.version });
      expect((await repository.listPublishedTaxonomy("buyer")).some((category) => category.id === root.id)).toBe(true);
      await expect(service.updateCategory(root.id, actor, { expectedVersion: root.version, name: "Stale edit" })).rejects.toMatchObject({ status: 409, code: "CATEGORY_VERSION_CONFLICT" });
      const editedRoot = await service.updateCategory(root.id, actor, { expectedVersion: publishedRoot.version, name: `Phase 5 Updated ${suffix}` });
      expect(editedRoot.status).toBe("draft");
      expect((await repository.listPublishedTaxonomy("buyer")).find((category) => category.id === root.id)?.name).toBe(`Phase 5 Root ${suffix}`);
      const resubmittedRoot = await service.transitionCategory(root.id, "submit", actor, { expectedVersion: editedRoot.version });
      const republishedRoot = await service.transitionCategory(root.id, "publish", actor, { expectedVersion: resubmittedRoot.version });
      expect((await repository.listPublishedTaxonomy("buyer")).find((category) => category.id === root.id)?.name).toBe(`Phase 5 Updated ${suffix}`);

      const first = await service.createCategory(actor, { parentId: root.id, name: `First ${suffix}`, slug: `phase-5-first-${suffix}`, icon: "Leaf", imageUrl: null, buyerVisible: true, sellerOnly: false, translations: {}, content: {} });
      const second = await service.createCategory(actor, { parentId: root.id, name: `Second ${suffix}`, slug: `phase-5-second-${suffix}`, icon: "Leaf", imageUrl: null, buyerVisible: true, sellerOnly: false, translations: {}, content: {} });
      createdIds.push(first.id, second.id);
      await expect(service.updateCategory(root.id, actor, { expectedVersion: republishedRoot.version, parentId: first.id })).rejects.toMatchObject({ status: 422, code: "CATEGORY_HIERARCHY_CYCLE" });
      await expect(service.createCategory(actor, { parentId: null, name: `Duplicate ${suffix}`, slug: `phase-5-root-${suffix}`, icon: "Leaf", imageUrl: null, buyerVisible: true, sellerOnly: false, translations: {}, content: {} })).rejects.toMatchObject({ status: 409, code: "CATEGORY_SLUG_CONFLICT" });
      await expect(service.reorderCategories(actor, { parentId: root.id, orderedIds: [first.id], expectedVersions: { [first.id]: first.version } })).rejects.toMatchObject({ status: 422, code: "CATEGORY_REORDER_INCOMPLETE" });
      const reordered = await service.reorderCategories(actor, { parentId: root.id, orderedIds: [second.id, first.id], expectedVersions: { [first.id]: first.version, [second.id]: second.version } });
      expect(reordered.map((category) => category.id)).toEqual([second.id, first.id]);

      const pendingFirst = await service.transitionCategory(first.id, "submit", actor, { expectedVersion: reordered.find((category) => category.id === first.id)!.version });
      const publishedFirst = await service.transitionCategory(first.id, "publish", actor, { expectedVersion: pendingFirst.version });
      await pool.query(
        `INSERT INTO commerce_products(id,name,description,price_minor,currency,unit,stock,category_id,subcategory_id,farmer_id,product_data,moderation_status)
         VALUES ($1,'Phase 5 reference','Reference protection',100,'GBP','kg',1,$2,$3,'catalog_seed',$4::jsonb,'draft')`,
        [productId, root.id, first.id, JSON.stringify({ id: productId, name: "Phase 5 reference", categoryId: root.id, subcategoryId: first.id })],
      );
      await expect(service.transitionCategory(first.id, "archive", actor, { expectedVersion: publishedFirst.version, reason: "Attempt referenced archive" })).rejects.toMatchObject({ status: 422, code: "CATEGORY_REFERENCED" });
      await pool.query("DELETE FROM commerce_products WHERE id=$1", [productId]);
      const archivedFirst = await service.transitionCategory(first.id, "archive", actor, { expectedVersion: publishedFirst.version, reason: "Reference removed" });
      expect(archivedFirst.status).toBe("archived");
      expect((await repository.listPublishedTaxonomy("seller")).find((category) => category.id === root.id)?.subcategories.some((subcategory) => subcategory.id === first.id)).toBe(false);
      expect((await repository.getAdminCategory(first.id))?.status).toBe("archived");
      expect((await repository.getCategoryEvents(first.id)).map((event) => event.eventType)).toEqual(expect.arrayContaining(["created", "reordered", "submitted", "published", "archived"]));
      const audit = await pool.query("SELECT action FROM admin_audit_events WHERE target_type='category' AND target_id=ANY($1::varchar[])", [createdIds]);
      expect(audit.rows.map((row: { action: string }) => row.action)).toEqual(expect.arrayContaining(["admin.category_created", "admin.category_published", "admin.category_archived", "admin.category_reordered"]));
    } finally {
      await pool.query("DELETE FROM commerce_products WHERE id=$1", [productId]).catch(() => undefined);
      await pool.query("DELETE FROM admin_audit_events WHERE target_type='category' AND target_id=ANY($1::varchar[])", [createdIds]).catch(() => undefined);
      for (const id of [...createdIds].reverse()) await pool.query("DELETE FROM catalog_categories WHERE id=$1", [id]).catch(() => undefined);
      await pool.query("DELETE FROM users WHERE id=$1", [actorId]).catch(() => undefined);
    }
  });

  test("serves only published categories from the canonical public API", async ({ request }) => {
    const response = await request.get("/api/catalog/categories?audience=buyer");
    expect(response.status()).toBe(200);
    const categories = await response.json();
    expect(categories).toEqual(expect.arrayContaining([expect.objectContaining({ id: "daily-needs", subcategories: expect.any(Array) })]));
    expect(categories.every((category: { buyerVisible?: boolean }) => category.buyerVisible !== false)).toBe(true);
  });

  test("restores published categories in the public desktop menu after taxonomy loading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("app-nav-rail")).toBeVisible();
    await expect(page.getByTestId("nav-rail-cat-daily")).toBeVisible();
    await expect(page.getByTestId("nav-rail-cat-fresh")).toBeVisible();
    await expect(page.getByTestId("nav-rail-cat-inputs")).toBeVisible();

    const publicCategoryImages = page.locator('[data-testid^="main-category-"] img, [data-testid^="subcategory-"] img');
    await expect.poll(() => publicCategoryImages.count()).toBeGreaterThan(0);
    await expect.poll(
      () => publicCategoryImages.evaluateAll((images) => images
        .filter((image) => !(image as HTMLImageElement).complete || (image as HTMLImageElement).naturalWidth === 0)
        .map((image) => image.getAttribute("src"))),
      { timeout: 30_000 },
    ).toEqual([]);

    await page.getByTestId("nav-rail-cat-livestock").click();
    for (const subcategoryId of ["dairy-animals", "meat-animals", "poultry", "aquaculture"]) {
      const image = page.getByTestId(`button-subcategory-${subcategoryId}`).locator("img");
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
  });
});
