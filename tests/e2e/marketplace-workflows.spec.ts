import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  createAuthenticatedApi,
  getTestAccount,
  hasTestAccount,
} from "./helpers/authenticated-api";

type User = { id: string; role: string };
type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  farmerId: string;
  farmerName: string;
  images: string[];
};
type CartItem = { id: string; productId: string; quantity: number; product: Product };
type Cart = { items: CartItem[]; total: number };
type Order = {
  id: string;
  buyerId: string;
  buyerEmail?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    farmerId: string;
    farmerName: string;
  }>;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
};

const enabled = process.env.RUN_MARKETPLACE_E2E === "true";
const accountsConfigured = hasTestAccount("BUYER") && hasTestAccount("SELLER") && hasTestAccount("ADMIN");

test.describe("orders, cart, checkout, and role-safe dashboards", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!enabled, "Set RUN_MARKETPLACE_E2E=true to run state-changing marketplace checks.");
  test.skip(
    !accountsConfigured,
    "Set dedicated E2E_BUYER_*, E2E_SELLER_*, and E2E_ADMIN_* credentials before running these checks.",
  );

  let buyerApi: APIRequestContext;
  let sellerApi: APIRequestContext;
  let adminApi: APIRequestContext;
  let buyer: User;
  let seller: User;
  let product: Product;
  let order: Order;

  test.beforeAll(async () => {
    buyerApi = await createAuthenticatedApi(getTestAccount("BUYER"));
    sellerApi = await createAuthenticatedApi(getTestAccount("SELLER"));
    adminApi = await createAuthenticatedApi(getTestAccount("ADMIN"));

    buyer = await (await buyerApi.get("/api/auth/user")).json();
    seller = await (await sellerApi.get("/api/auth/user")).json();
    if (buyer.id === seller.id) throw new Error("Buyer and seller test accounts must be different users");
    if (buyer.role !== "buyer") {
      throw new Error(`Buyer test account must have the buyer role; received ${buyer.role}`);
    }
    if (seller.role !== "farmer") {
      throw new Error(`Seller test account must have the farmer role; received ${seller.role}`);
    }
    const admin = (await (await adminApi.get("/api/auth/user")).json()) as User;
    if (admin.role !== "admin") {
      throw new Error(`Admin test account must have the admin role; received ${admin.role}`);
    }
    if (admin.id === buyer.id || admin.id === seller.id) {
      throw new Error("Admin, buyer, and seller test accounts must be different users");
    }

    const categoriesResponse = await sellerApi.get("/api/categories");
    expect(categoriesResponse.ok()).toBeTruthy();
    const categories = (await categoriesResponse.json()) as Array<{
      id: string;
      subcategories: Array<{ id: string }>;
    }>;
    const category = categories.find((candidate) => candidate.subcategories.length > 0);
    if (!category) throw new Error("At least one category with a subcategory is required for this test");

    const createProduct = await sellerApi.post("/api/products", {
      data: {
        name: `E2E Marketplace Product ${Date.now()}`,
        description: "Temporary product created by the marketplace integration test.",
        price: 12.5,
        unit: "kg",
        stock: 6,
        categoryId: category.id,
        subcategoryId: category.subcategories[0].id,
        images: ["https://example.com/e2e-marketplace-product.jpg"],
        isOrganic: false,
      },
    });
    expect(createProduct.status()).toBe(201);
    product = await createProduct.json();
    expect(product.farmerId).toBe(seller.id);

    await buyerApi.delete("/api/cart");
    await sellerApi.delete("/api/cart");
  });

  test.afterAll(async () => {
    if (buyerApi) await buyerApi.delete("/api/cart").catch(() => undefined);
    if (sellerApi) await sellerApi.delete("/api/cart").catch(() => undefined);
    if (sellerApi && product?.id) {
      await sellerApi.delete(`/api/products/${product.id}`).catch(() => undefined);
    }
    await buyerApi?.dispose();
    await sellerApi?.dispose();
    await adminApi?.dispose();
  });

  test("validates ownership, stock, and duplicate cart additions", async () => {
    const buyerProductUpdate = await buyerApi.patch(`/api/products/${product.id}`, {
      data: { stock: 100 },
    });
    expect(buyerProductUpdate.status()).toBe(403);

    const excessiveOrder = await buyerApi.post("/api/orders", {
      data: {
        items: [{
          productId: product.id,
          productName: product.name,
          quantity: product.stock + 1,
          price: product.price,
          farmerId: product.farmerId,
          farmerName: product.farmerName,
        }],
        deliveryAddress: "1 Integration Test Road",
        paymentMethod: "manual",
        deliveryMethod: "standard",
      },
    });
    expect(excessiveOrder.status()).toBe(400);

    expect((await buyerApi.post("/api/cart", {
      data: { productId: product.id, quantity: 1 },
    })).status()).toBe(201);
    expect((await buyerApi.post("/api/cart", {
      data: { productId: product.id, quantity: 1 },
    })).status()).toBe(201);

    const buyerCart = (await (await buyerApi.get("/api/cart")).json()) as Cart;
    const matchingItems = buyerCart.items.filter((item) => item.productId === product.id);
    expect(matchingItems).toHaveLength(1);
    expect(matchingItems[0].quantity).toBe(2);
    expect(buyerCart.total).toBe(product.price * 2);

    const sellerCart = (await (await sellerApi.get("/api/cart")).json()) as Cart;
    expect(sellerCart.items.some((item) => item.productId === product.id)).toBeFalsy();

    const invalidQuantity = await buyerApi.patch(`/api/cart/${matchingItems[0].id}`, {
      data: { quantity: 0 },
    });
    expect(invalidQuantity.status()).toBe(400);

    const excessiveQuantity = await buyerApi.patch(`/api/cart/${matchingItems[0].id}`, {
      data: { quantity: product.stock + 1 },
    });
    expect(excessiveQuantity.status()).toBe(400);
  });

  test("retains the cart after failed checkout and clears it after successful checkout", async () => {
    const beforeFailure = (await (await buyerApi.get("/api/cart")).json()) as Cart;
    expect(beforeFailure.items.some((item) => item.productId === product.id)).toBeTruthy();

    const failedCheckout = await buyerApi.post("/api/cart/checkout", {
      data: { deliveryAddress: "", deliveryMethod: "standard" },
    });
    expect(failedCheckout.status()).toBe(400);
    const afterFailure = (await (await buyerApi.get("/api/cart")).json()) as Cart;
    expect(afterFailure.items.some((item) => item.productId === product.id)).toBeTruthy();

    const checkout = await buyerApi.post("/api/cart/checkout", {
      data: { deliveryAddress: "1 Integration Test Road", deliveryMethod: "standard" },
    });
    expect(checkout.status()).toBe(201);
    order = await checkout.json();

    expect(order.buyerId).toBe(buyer.id);
    expect(order.status).toBe("pending");
    expect(order.paymentMethod).toBe("manual");
    expect(order.paymentStatus).toBe("manual");
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({ productId: product.id, quantity: 2, price: product.price });
    expect(order.subtotal).toBe(product.price * 2);
    expect(order.tax).toBe(Number((order.subtotal * 0.2).toFixed(2)));
    expect(order.deliveryFee).toBe(4.99);
    expect(order.total).toBe(Number((order.subtotal + order.tax + order.deliveryFee).toFixed(2)));

    const afterSuccess = (await (await buyerApi.get("/api/cart")).json()) as Cart;
    expect(afterSuccess.items).toHaveLength(0);
  });

  test("shows the order only in the correct buyer and seller views", async () => {
    const buyerOrders = (await (await buyerApi.get("/api/orders")).json()) as Order[];
    expect(buyerOrders.some((candidate) => candidate.id === order.id)).toBeTruthy();

    const sellerOrders = (await (await sellerApi.get("/api/seller/orders")).json()) as Order[];
    const sellerOrder = sellerOrders.find((candidate) => candidate.id === order.id);
    expect(sellerOrder).toBeDefined();
    expect(sellerOrder?.items.every((item) => item.farmerId === seller.id)).toBeTruthy();
    expect(sellerOrder?.buyerEmail).toBeUndefined();

    const sellerDetail = await sellerApi.get(`/api/orders/${order.id}`);
    expect(sellerDetail.ok()).toBeTruthy();
    const sellerDetailBody = (await sellerDetail.json()) as Order;
    expect(sellerDetailBody.id).toBe(order.id);
    expect(sellerDetailBody.buyerEmail).toBeUndefined();

    const unrelatedOrder = await adminApi.get(`/api/orders/${order.id}`);
    expect(unrelatedOrder.status()).toBe(403);
  });

  test("enforces seller-only status transitions and keeps payment manual", async () => {
    expect((await buyerApi.patch(`/api/orders/${order.id}/status`, {
      data: { status: "confirmed" },
    })).status()).toBe(403);

    expect((await sellerApi.patch(`/api/orders/${order.id}/status`, {
      data: { status: "not-a-status" },
    })).status()).toBe(400);
    expect((await sellerApi.patch(`/api/orders/${order.id}/status`, {
      data: { status: "shipped" },
    })).status()).toBe(400);

    for (const status of ["confirmed", "processing", "shipped", "delivered"] as const) {
      const response = await sellerApi.patch(`/api/orders/${order.id}/status`, { data: { status } });
      expect(response.ok(), `transition to ${status}`).toBeTruthy();
      order = await response.json();
      expect(order.status).toBe(status);
      expect(order.paymentStatus).toBe("manual");
    }
  });

  test("returns role-safe seller and operator dashboards", async () => {
    expect((await buyerApi.get("/api/dashboard/seller")).status()).toBe(403);
    expect((await buyerApi.get("/api/dashboard/operator")).status()).toBe(403);
    expect((await sellerApi.get("/api/dashboard/operator")).status()).toBe(403);

    const sellerDashboardResponse = await sellerApi.get("/api/dashboard/seller");
    expect(sellerDashboardResponse.ok()).toBeTruthy();
    const sellerDashboard = await sellerDashboardResponse.json();
    expect(sellerDashboard.products.every((item: Product) => item.farmerId === seller.id)).toBeTruthy();
    expect(sellerDashboard.orders.every((item: Order) =>
      item.items.every((orderItem) => orderItem.farmerId === seller.id)
      && item.buyerEmail === undefined
    )).toBeTruthy();
    expect(sellerDashboard.summary).toEqual(expect.objectContaining({
      productCount: expect.any(Number),
      orderCount: expect.any(Number),
      salesTotal: expect.any(Number),
    }));

    const operatorResponse = await adminApi.get("/api/dashboard/operator");
    expect(operatorResponse.ok()).toBeTruthy();
    const operatorText = JSON.stringify(await operatorResponse.json()).toLowerCase();
    for (const sensitiveKey of ["password", "token", "session", "email", "address"]) {
      expect(operatorText).not.toContain(sensitiveKey);
    }
  });

  test("rejects unavailable products", async () => {
    const unavailable = await sellerApi.patch(`/api/products/${product.id}`, { data: { stock: 0 } });
    expect(unavailable.ok()).toBeTruthy();
    const addUnavailable = await buyerApi.post("/api/cart", {
      data: { productId: product.id, quantity: 1 },
    });
    expect(addUnavailable.status()).toBe(400);
  });
});
