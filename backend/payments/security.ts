const secretKeyPattern =
  /(authorization|secret|signature|token|client_secret|key_secret|api_key|password|rawBody)/i;

export function redactPaymentData(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[redacted-depth]";
  if (Array.isArray(value)) return value.map((entry) => redactPaymentData(entry, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        secretKeyPattern.test(key) ? "[redacted]" : redactPaymentData(entry, depth + 1),
      ]),
    );
  }
  return typeof value === "string" && value.length > 1000
    ? `${value.slice(0, 1000)}…`
    : value;
}

export function paymentErrorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; type?: unknown; name?: unknown };
    const code = candidate.code ?? candidate.type ?? candidate.name;
    if (typeof code === "string" && /^[A-Za-z0-9_.:-]{1,100}$/.test(code)) return code;
  }
  return "payment_operation_failed";
}

export function logPaymentFailure(
  operation: string,
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  console.error("[payments]", operation, {
    ...redactPaymentData(context) as Record<string, unknown>,
    errorCode: paymentErrorCode(error),
  });
}

export function publicPaymentError(
  fallback = "The payment operation could not be completed. Please try again.",
): { error: string } {
  return { error: fallback };
}

