type SmsResult = { success: boolean; error?: string };

type VonageSmsConfig = {
  apiKey: string;
  apiSecret: string;
  from: string;
};

function firstEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function getVonageSmsConfig(): VonageSmsConfig | undefined {
  const apiKey = firstEnv(["VONAGE_API_KEY", "NEXMO_API_KEY"]);
  const apiSecret = firstEnv(["VONAGE_API_SECRET", "NEXMO_API_SECRET"]);
  const from = firstEnv([
    "VONAGE_FROM",
    "VONAGE_FROM_NUMBER",
    "VONAGE_SMS_FROM",
    "VONAGE_BRAND_NAME",
    "NEXMO_FROM",
  ]);

  if (!apiKey || !apiSecret || !from) return undefined;
  return { apiKey, apiSecret, from };
}

function toVonageMsisdn(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isSmsConfigured(): boolean {
  return !!getVonageSmsConfig();
}

export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  const config = getVonageSmsConfig();

  if (!config) {
    console.log(`[sms:simulated] to=${phone} :: ${message}`);
    return { success: true };
  }

  const to = toVonageMsisdn(phone);
  if (!to) {
    return { success: false, error: "Invalid phone number" };
  }

  try {
    const res = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        api_key: config.apiKey,
        api_secret: config.apiSecret,
        from: config.from,
        to,
        text: message,
      }),
    });

    const payload = await res.json().catch(() => null) as
      | { messages?: Array<{ status?: string; "error-text"?: string }> }
      | null;

    if (!res.ok) {
      console.warn("[sms] Vonage request failed", res.status);
      return { success: false, error: `Vonage HTTP error: ${res.status}` };
    }

    const smsStatus = payload?.messages?.[0];
    if (smsStatus?.status !== "0") {
      const error = smsStatus?.["error-text"] || `Vonage status: ${smsStatus?.status ?? "unknown"}`;
      console.warn("[sms] Vonage delivery failed", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.warn("[sms] Vonage error", (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}
