const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

function useTurnstileTestKeys(): boolean {
  return process.env.NODE_ENV !== "production" &&
    process.env.TURNSTILE_USE_TEST_KEYS?.trim().toLocaleLowerCase() !== "false";
}

export function getTurnstileSiteKey(): string {
  if (useTurnstileTestKeys()) return TURNSTILE_TEST_SITE_KEY;
  return (
    process.env.TURNSTILE_SITE_KEY ||
    process.env.VITE_TURNSTILE_SITE_KEY ||
    ""
  ).trim();
}

type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export type TurnstileVerification =
  | { success: true }
  | {
      success: false;
      code: "captcha_not_configured" | "captcha_invalid" | "captcha_unavailable";
    };

export async function verifyCheckoutTurnstile(
  token: string,
  remoteIp?: string,
): Promise<TurnstileVerification> {
  const testMode = useTurnstileTestKeys();
  const secret = testMode
    ? TURNSTILE_TEST_SECRET_KEY
    : process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { success: false, code: "captcha_not_configured" };
  if (!token.trim() || token.length > 2048) {
    return { success: false, code: "captcha_invalid" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (remoteIp) form.set("remoteip", remoteIp);
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) return { success: false, code: "captcha_unavailable" };

    const result = (await response.json()) as TurnstileResponse;
    if (!result.success) return { success: false, code: "captcha_invalid" };
    if (result.action && result.action !== "checkout") {
      return { success: false, code: "captcha_invalid" };
    }

    if (!testMode) {
      const allowedHostnames = (process.env.TURNSTILE_EXPECTED_HOSTNAME ?? "")
        .split(",")
        .map((hostname) => hostname.trim().toLocaleLowerCase())
        .filter(Boolean);
      if (
        allowedHostnames.length > 0 &&
        (!result.hostname || !allowedHostnames.includes(result.hostname.toLocaleLowerCase()))
      ) {
        return { success: false, code: "captcha_invalid" };
      }
    }

    return { success: true };
  } catch {
    return { success: false, code: "captcha_unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
