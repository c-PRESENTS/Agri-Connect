import Stripe from "stripe";

let cached: Stripe | null = null;

export function getConfiguredStripeSecretKey(): string | undefined {
  return (
    process.env.STRIPE_SECRET_KEY?.trim() ||
    process.env.STRIPE_PRIVATE_KEY?.trim() ||
    undefined
  );
}

export function hasStripeTestSecretKey(): boolean {
  return getConfiguredStripeSecretKey()?.startsWith("sk_test_") ?? false;
}

export function getConfiguredStripeWebhookSecret(): string | undefined {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return secret || undefined;
}

export function hasStripeWebhookSecret(): boolean {
  return getConfiguredStripeWebhookSecret()?.startsWith("whsec_") ?? false;
}

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = getConfiguredStripeSecretKey();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY or STRIPE_PRIVATE_KEY is not set in environment",
    );
  }
  cached = new Stripe(key);
  return cached;
}

export function getWebhookSecret(): string {
  const secret = getConfiguredStripeWebhookSecret();
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set in environment");
  }
  if (!secret.startsWith("whsec_")) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be a Stripe signing secret");
  }
  return secret;
}
