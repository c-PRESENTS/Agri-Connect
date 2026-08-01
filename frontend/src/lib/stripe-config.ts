const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();

export function getStripePublishableKey(): string | undefined {
  return publishableKey || undefined;
}

export function hasStripeTestPublishableKey(): boolean {
  return publishableKey?.startsWith("pk_test_") ?? false;
}
