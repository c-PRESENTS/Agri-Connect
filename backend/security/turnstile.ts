const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

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
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
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

    return { success: true };
  } catch {
    return { success: false, code: "captcha_unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}

