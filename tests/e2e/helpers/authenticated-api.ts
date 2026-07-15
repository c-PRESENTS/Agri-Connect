import { request, type APIRequestContext } from "@playwright/test";

export type TestAccount = {
  email: string;
  password: string;
};

export function hasTestAccount(prefix: "BUYER" | "SELLER" | "ADMIN"): boolean {
  return Boolean(process.env[`E2E_${prefix}_EMAIL`] && process.env[`E2E_${prefix}_PASSWORD`]);
}

export function getTestAccount(prefix: "BUYER" | "SELLER" | "ADMIN"): TestAccount {
  const email = process.env[`E2E_${prefix}_EMAIL`];
  const password = process.env[`E2E_${prefix}_PASSWORD`];
  if (!email || !password) {
    throw new Error(`E2E_${prefix}_EMAIL and E2E_${prefix}_PASSWORD are required`);
  }
  return { email, password };
}

export async function createAuthenticatedApi(account: TestAccount): Promise<APIRequestContext> {
  const context = await request.newContext({
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:5000",
  });
  const response = await context.post("/api/auth/login", { data: account });
  if (!response.ok()) {
    const message = await response.text();
    await context.dispose();
    throw new Error(`Test-account login failed (${response.status()}): ${message}`);
  }
  return context;
}
