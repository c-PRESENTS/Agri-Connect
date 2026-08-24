/// <reference types="node" />
import { randomUUID } from "crypto";
import { expect, test } from "@playwright/test";
import { visibleAdminNavigation } from "../../frontend/src/lib/admin-navigation";
import { isProductModerationTransitionAllowed, parseAdminProductQuery } from "../../backend/organisations/admin-product-validation";

test.describe("organisation admin portal Phase 4", () => {
  test("validates queue filters, transition rules, and permission-aware navigation", () => {
    expect(parseAdminProductQuery({ page: "2", pageSize: "50", status: "pending_review", featured: "false", sort: "price", direction: "asc" })).toMatchObject({ page: 2, pageSize: 50, status: "pending_review", featured: false, sort: "price", direction: "asc" });
    expect(() => parseAdminProductQuery({ pageSize: "51" })).toThrow();
    expect(() => parseAdminProductQuery({ status: "published" })).toThrow();
    expect(() => parseAdminProductQuery({ sort: "passwordHash" })).toThrow();
    expect(isProductModerationTransitionAllowed("draft", "pending_review")).toBe(true);
    expect(isProductModerationTransitionAllowed("pending_review", "approved")).toBe(true);
    expect(isProductModerationTransitionAllowed("pending_review", "rejected")).toBe(true);
    expect(isProductModerationTransitionAllowed("pending_review", "changes_requested")).toBe(true);
    expect(isProductModerationTransitionAllowed("changes_requested", "pending_review")).toBe(true);
    expect(isProductModerationTransitionAllowed("approved", "suspended")).toBe(true);
    expect(isProductModerationTransitionAllowed("suspended", "approved")).toBe(true);
    expect(isProductModerationTransitionAllowed("draft", "approved")).toBe(false);
    expect(isProductModerationTransitionAllowed("rejected", "pending_review")).toBe(false);
    expect(isProductModerationTransitionAllowed("removed", "approved")).toBe(false);
    expect(visibleAdminNavigation(["products.view"]).map((item) => item.path)).toEqual(["/admin/products"]);
  });

  test("requires authentication for every Phase 4 admin API and UI route", async ({ page, request }) => {
    const id = randomUUID();
    const responses = await Promise.all([
      request.get("/api/admin/products"),
      request.get(`/api/admin/products/${id}`),
      request.post(`/api/admin/products/${id}/approve`, { data: {} }),
      request.post(`/api/admin/products/${id}/reject`, { data: {} }),
      request.post(`/api/admin/products/${id}/request-changes`, { data: {} }),
      request.post(`/api/admin/products/${id}/suspend`, { data: {} }),
      request.post(`/api/admin/products/${id}/restore`, { data: {} }),
      request.post(`/api/admin/products/${id}/remove`, { data: {} }),
      request.post(`/api/admin/products/${id}/feature`, { data: {} }),
      request.post(`/api/admin/products/${id}/fresh-pick`, { data: {} }),
    ]);
    for (const response of responses) expect(response.status()).toBe(401);
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/sign-in\?returnTo=%2Fadmin%2Fproducts/);
  });

  test("preserves the moderator, operations, marketing, and viewer permission matrix", async () => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for role-permission verification");
    const { pool } = await import("../../backend/config/db");
    const result = await pool.query(
      `SELECT r.code,array_agg(p.code ORDER BY p.code) AS permissions
         FROM admin_roles r
         JOIN admin_role_permissions rp ON rp.role_id=r.id
         JOIN admin_permissions p ON p.id=rp.permission_id
        WHERE r.code=ANY($1::varchar[]) AND r.scope='platform'
        GROUP BY r.code`,
      [["moderator", "operations", "marketing", "viewer"]],
    );
    const permissions = new Map(result.rows.map((row: { code: string; permissions: string[] }) => [row.code, row.permissions]));
    expect(permissions.get("moderator")).toEqual(expect.arrayContaining(["products.view", "products.approve", "products.reject", "products.suspend", "products.feature"]));
    expect(permissions.get("operations")).toEqual(expect.arrayContaining(["products.view", "products.approve", "products.reject", "products.suspend"]));
    expect(permissions.get("operations")).not.toContain("products.feature");
    expect(permissions.get("marketing")).toEqual(expect.arrayContaining(["products.view", "products.feature"]));
    expect(permissions.get("marketing")).not.toContain("products.approve");
    expect(permissions.get("viewer")).toContain("products.view");
    expect(permissions.get("viewer")).not.toContain("products.approve");
    expect(permissions.get("viewer")).not.toContain("products.feature");
  });

  test("submits, approves, promotes, suspends, restores, and revalidates checkout transactionally", async () => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for live Phase 4 transaction verification");
    const [{ pool }, moderation, adminProducts, commerce, storageModule, recommendations, regional] = await Promise.all([
      import("../../backend/config/db"),
      import("../../backend/organisations/admin-product-service"),
      import("../../backend/organisations/admin-product-repository"),
      import("../../backend/repositories/commerce-repository"),
      import("../../backend/storage"),
      import("../../backend/catalog/home-recommendations"),
      import("../../backend/repositories/regional-marketplace-repository"),
    ]);
    const actorId = randomUUID();
    const sellerId = randomUUID();
    const buyerId = randomUUID();
    const regionId = randomUUID();
    const productId = `phase4-${randomUUID()}`;
    const access = { hasAccess: true, organisation: { id: "agriconnect-platform", name: "AgriConnect", slug: "agriconnect", type: "platform", status: "approved" }, membership: null, role: null, permissions: ["products.view", "products.approve", "products.reject", "products.suspend", "products.feature", "products.remove"] as any };
    const actor = { userId: actorId, access, requestId: "phase-4-test" };
    try {
      await pool.query("INSERT INTO market_regions (id,code,name,country_code,type,data_version,active) VALUES ($1,$2,'Phase 4 Test Region','GB','county','phase-4-test',true)", [regionId, `PHASE-4-${regionId}`]);
      await pool.query("INSERT INTO users (id,email,auth_method,role,name,profile_complete,account_status) VALUES ($1,$2,'password','admin','Phase 4 Reviewer',true,'active'),($3,$4,'password','farmer','Phase 4 Seller',true,'active'),($5,$6,'password','buyer','Phase 4 Buyer',true,'active')", [actorId, `${actorId}@example.invalid`, sellerId, `${sellerId}@example.invalid`, buyerId, `${buyerId}@example.invalid`]);
      await pool.query("INSERT INTO seller_verification_cases (seller_id,status,country,entity_type,requirements_version,submitted_at,reviewed_at,reviewed_by) VALUES ($1,'verified','GB','individual','phase-4-test',now(),now(),$2)", [sellerId, actorId]);
      await pool.query("INSERT INTO seller_region_assignments (seller_id,organisation_id,region_id,status,can_publish,can_fulfil,approved_by,approved_at,effective_at,reason) VALUES ($1,'agriconnect-platform',$2,'active',true,true,$3,now(),now(),'Phase 4 transaction test')", [sellerId, regionId, actorId]);
      await pool.query(
        `INSERT INTO commerce_products
           (id,name,description,price_minor,currency,unit,stock,category_id,subcategory_id,farmer_id,region_id,product_data,moderation_status)
         VALUES ($1,'Phase 4 Apples','A transaction-tested product',399,'GBP','kg',20,'fresh-produce','fruits',$2,$3,$4::jsonb,'draft')`,
        [productId, sellerId, regionId, JSON.stringify({ id: productId, name: "Phase 4 Apples", description: "A transaction-tested product", price: 3.99, unit: "kg", stock: 20, categoryId: "fresh-produce", subcategoryId: "fruits", farmerId: sellerId, images: ["https://example.com/phase-4-apples.jpg"], isOrganic: false, isFeatured: false, rating: 0, reviewCount: 0, createdAt: new Date().toISOString(), publicationStatus: "draft" })],
      );
      let row = await pool.query("SELECT updated_at FROM commerce_products WHERE id=$1", [productId]);
      const draftUpdatedAt = new Date(row.rows[0].updated_at).toISOString();
      expect(await commerce.commerceRepository.getProduct(productId)).toBeUndefined();
      await moderation.submitSellerProduct(productId, sellerId, draftUpdatedAt);
      expect(await commerce.commerceRepository.getProduct(productId)).toBeUndefined();
      row = await pool.query("SELECT moderation_status,updated_at FROM commerce_products WHERE id=$1", [productId]);
      expect(row.rows[0].moderation_status).toBe("pending_review");
      const queue = await adminProducts.listAdminProducts(parseAdminProductQuery({ search: "Phase 4 Apples", status: "pending_review", page: "1", pageSize: "5" }));
      expect(queue).toMatchObject({ products: [expect.objectContaining({ id: productId, seller: expect.objectContaining({ isEligible: true }) })], pagination: { total: 1 } });
      expect(await adminProducts.getAdminProductDetail(productId)).toMatchObject({ product: { id: productId, moderationStatus: "pending_review", images: ["https://example.com/phase-4-apples.jpg"] } });
      await expect(moderation.moderateProduct(productId, actor, { toStatus: "suspended", expectedUpdatedAt: new Date(row.rows[0].updated_at).toISOString(), reason: "Invalid pending transition", permission: "products.suspend", action: "suspend", validCategory: true })).rejects.toMatchObject({ status: 422, code: "PRODUCT_TRANSITION_INVALID" });
      const pendingUpdatedAt = new Date(row.rows[0].updated_at).toISOString();
      await moderation.moderateProduct(productId, actor, { toStatus: "approved", expectedUpdatedAt: pendingUpdatedAt, permission: "products.approve", action: "approve", validCategory: true });
      await expect(moderation.moderateProduct(productId, actor, { toStatus: "suspended", expectedUpdatedAt: pendingUpdatedAt, reason: "Stale reviewer", permission: "products.suspend", action: "suspend", validCategory: true })).rejects.toMatchObject({ status: 409, code: "PRODUCT_STALE_UPDATE" });
      let publicProduct = await commerce.commerceRepository.getProduct(productId);
      expect(publicProduct).toMatchObject({ id: productId, moderationStatus: "approved", publicationStatus: "published", isFeatured: false, isFreshPick: false });
      expect(await storageModule.storage.getProducts({ search: "Phase 4 Apples" })).toContainEqual(expect.objectContaining({ id: productId }));
      expect(await regional.regionalMarketplaceRepository.isProductMarketplaceEligible(productId)).toBe(true);
      await moderation.setProductPromotion(productId, actor, { field: "is_featured", enabled: true, expectedUpdatedAt: publicProduct!.updatedAt! });
      publicProduct = await commerce.commerceRepository.getProduct(productId);
      await moderation.setProductPromotion(productId, actor, { field: "is_fresh_pick", enabled: true, expectedUpdatedAt: publicProduct!.updatedAt! });
      publicProduct = await commerce.commerceRepository.getProduct(productId);
      expect(publicProduct).toMatchObject({ isFeatured: true, isFreshPick: true });
      const home = recommendations.buildHomeProductRecommendations({ products: [publicProduct!], userLocation: { label: "Test", latitude: 0, longitude: 0 } });
      expect(home.featuredProducts).toContainEqual(expect.objectContaining({ id: productId }));
      expect(home.freshPicks).toContainEqual(expect.objectContaining({ id: productId }));
      await commerce.commerceRepository.putCartItem(buyerId, publicProduct!, 1);
      await moderation.moderateProduct(productId, actor, { toStatus: "suspended", expectedUpdatedAt: publicProduct!.updatedAt!, reason: "Immediate reversible safety suspension", permission: "products.suspend", action: "suspend", validCategory: true });
      expect(await commerce.commerceRepository.getProduct(productId)).toBeUndefined();
      expect(await regional.regionalMarketplaceRepository.isProductMarketplaceEligible(productId)).toBe(false);
      expect(await storageModule.storage.validateCart([{ productId, quantity: 1 }])).toMatchObject({ ok: false, issues: [expect.objectContaining({ productId, reason: "missing" })] });
      await expect(storageModule.storage.createOrder(buyerId, [{ productId, productName: "Phase 4 Apples", quantity: 1, price: 3.99, farmerId: sellerId, farmerName: "Phase 4 Seller" }], "Test address", "manual")).rejects.toThrow(/not found|available|published/i);
      row = await pool.query("SELECT moderation_status,is_featured,is_fresh_pick,updated_at FROM commerce_products WHERE id=$1", [productId]);
      expect(row.rows[0]).toMatchObject({ moderation_status: "suspended", is_featured: false, is_fresh_pick: false });
      await moderation.moderateProduct(productId, actor, { toStatus: "approved", expectedUpdatedAt: new Date(row.rows[0].updated_at).toISOString(), reason: "Safety review completed", permission: "products.suspend", action: "restore", validCategory: true });
      expect(await commerce.commerceRepository.getProduct(productId)).toMatchObject({ moderationStatus: "approved", isFeatured: false, isFreshPick: false });
      const events = await pool.query("SELECT event_type FROM product_moderation_events WHERE product_id=$1 ORDER BY created_at", [productId]);
      expect(events.rows.map((event: { event_type: string }) => event.event_type)).toEqual(expect.arrayContaining(["submitted", "approve", "feature_updated", "fresh_pick_updated", "suspend", "restore"]));
      const audits = await pool.query("SELECT action FROM admin_audit_events WHERE target_type='product' AND target_id=$1", [productId]);
      expect(audits.rows.map((event: { action: string }) => event.action)).toEqual(expect.arrayContaining(["seller.product_submitted", "admin.product_approve", "admin.product_suspend", "admin.product_restore"]));
      expect((await adminProducts.getAdminProductDetail(productId))?.moderationHistory.length).toBeGreaterThanOrEqual(6);
    } finally {
      await pool.query("DELETE FROM admin_audit_events WHERE target_type='product' AND target_id=$1", [productId]).catch(() => undefined);
      await pool.query("DELETE FROM commerce_carts WHERE user_id=$1", [buyerId]).catch(() => undefined);
      await pool.query("DELETE FROM commerce_products WHERE id=$1", [productId]).catch(() => undefined);
      await pool.query("DELETE FROM users WHERE id=ANY($1::varchar[])", [[sellerId, buyerId, actorId]]).catch(() => undefined);
      await pool.query("DELETE FROM market_regions WHERE id=$1", [regionId]).catch(() => undefined);
    }
  });
});
