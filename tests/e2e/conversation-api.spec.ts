/// <reference types="node" />
import { expect, test, type APIRequestContext } from "@playwright/test";
import { createAuthenticatedApi, getTestAccount, hasTestAccount } from "./helpers/authenticated-api";

test.describe("product conversation API", () => {
  test.skip(!hasTestAccount("BUYER") || !hasTestAccount("SELLER"), "Buyer and seller test accounts are required");
  test.describe.configure({ mode: "serial" });

  let buyerApi: APIRequestContext;
  let sellerApi: APIRequestContext;
  let buyerId = "";
  let sellerId = "";
  let productId = "";

  test.beforeAll(async () => {
    buyerApi = await createAuthenticatedApi(getTestAccount("BUYER"));
    sellerApi = await createAuthenticatedApi(getTestAccount("SELLER"));
    buyerId = String((await (await buyerApi.get("/api/auth/user")).json()).id);
    sellerId = String((await (await sellerApi.get("/api/auth/user")).json()).id);

    const categories = await (await sellerApi.get("/api/categories")).json() as Array<{ id: string; subcategories: Array<{ id: string }> }>;
    const category = categories.find((candidate) => candidate.subcategories.length > 0);
    if (!category) throw new Error("A product category is required");
    const response = await sellerApi.post("/api/products", { data: {
      name: `Conversation Test Product ${Date.now()}`,
      description: "Temporary product used to verify buyer and farmer messaging.",
      price: 10,
      unit: "kg",
      stock: 5,
      categoryId: category.id,
      subcategoryId: category.subcategories[0].id,
      images: ["https://example.com/conversation-product.jpg"],
      isOrganic: false,
    } });
    expect(response.status()).toBe(201);
    productId = String((await response.json()).id);
  });

  test.afterAll(async () => {
    if (sellerApi && productId) await sellerApi.delete(`/api/products/${productId}`).catch(() => undefined);
    await buyerApi?.dispose();
    await sellerApi?.dispose();
  });

  test("persists a participant-protected buyer and farmer conversation", async () => {
    const createResponse = await buyerApi.post("/api/conversations", { data: { productId } });
    expect(createResponse.status()).toBe(201);
    const conversation = await createResponse.json() as { id: string; buyerId: string; sellerId: string };
    expect(conversation.buyerId).toBe(buyerId);
    expect(conversation.sellerId).toBe(sellerId);

    const duplicateResponse = await buyerApi.post("/api/conversations", { data: { productId } });
    expect((await duplicateResponse.json()).id).toBe(conversation.id);

    expect((await buyerApi.post(`/api/conversations/${conversation.id}/messages`, { data: { content: "Is this available for collection?" } })).status()).toBe(201);

    const sellerThreads = await (await sellerApi.get(`/api/conversations?productId=${productId}`)).json() as Array<{ id: string; unreadCount: number }>;
    expect(sellerThreads).toHaveLength(1);
    expect(sellerThreads[0].id).toBe(conversation.id);
    expect(sellerThreads[0].unreadCount).toBe(1);

    expect((await sellerApi.post(`/api/conversations/${conversation.id}/messages`, { data: { content: "Yes, farm collection is available." } })).status()).toBe(201);
    const messagesResponse = await buyerApi.get(`/api/conversations/${conversation.id}/messages?page=1&pageSize=50`);
    expect(messagesResponse.ok()).toBeTruthy();
    const messagePage = await messagesResponse.json() as { total: number; messages: Array<{ senderId: string; content: string }> };
    expect(messagePage.total).toBe(2);
    expect(messagePage.messages.map((message) => message.senderId)).toEqual([buyerId, sellerId]);

    const readResponse = await buyerApi.post(`/api/conversations/${conversation.id}/read`, { data: {} });
    expect(readResponse.ok()).toBeTruthy();
    expect((await readResponse.json()).updated).toBe(1);
  });
});
