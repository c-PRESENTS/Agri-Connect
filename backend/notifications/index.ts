import type { Shipment } from "@shared/schema";

type NotifyChannel = "email" | "whatsapp" | "console";

interface NotifyParams {
  to: { email?: string; whatsapp?: string };
  subject: string;
  body: string;
  /** Optional short body (≤320 chars) used for SMS-style channels (WhatsApp). */
  shortBody?: string;
  shipment?: Shipment;
}

async function sendEmailViaSendGrid(toEmail: string, subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@agriconnect.app";
  if (!apiKey) return false;
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: fromEmail, name: "AgriConnect Ship" },
        subject,
        content: [{ type: "text/html", value: body.replace(/\n/g, "<br/>") }],
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn("[notify] SendGrid failed", res.status, txt.slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[notify] SendGrid error", err);
    return false;
  }
}

/**
 * Sends a free-text WhatsApp message via the Meta WhatsApp Cloud API.
 * Requires WHATSAPP_TOKEN (system-user access token) and
 * WHATSAPP_PHONE_NUMBER_ID (the from-number's id).
 *
 * Note: Meta only allows free-form text inside the 24h customer-service
 * window; outside that window a pre-approved template is required. For
 * Phase 2 (booking confirmation immediately after the buyer has interacted
 * with us by paying) we are inside the window, so text is safe.
 */
async function sendWhatsAppViaCloud(toPhone: string, message: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return false;
  // Strip everything except digits & leading +; Cloud API wants e164 without +
  const to = toPhone.replace(/[^\d]/g, "");
  if (!to) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message.slice(0, 1024), preview_url: true },
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn("[notify] WhatsApp failed", res.status, txt.slice(0, 240));
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[notify] WhatsApp error", (err as Error).message);
    return false;
  }
}

export async function notify(params: NotifyParams): Promise<{ channels: NotifyChannel[] }> {
  const used: NotifyChannel[] = [];
  const { to, subject, body, shortBody } = params;

  if (to.email) {
    const ok = await sendEmailViaSendGrid(to.email, subject, body);
    if (ok) used.push("email");
  }

  if (to.whatsapp) {
    const ok = await sendWhatsAppViaCloud(to.whatsapp, shortBody || `${subject}\n\n${body}`);
    if (ok) used.push("whatsapp");
    else console.log(`[notify:whatsapp:simulated] to=${to.whatsapp} :: ${shortBody || subject}`);
  }

  if (used.length === 0) {
    console.log(`[notify:console] to=${JSON.stringify(to)} subject="${subject}"\n${body}\n`);
    used.push("console");
  }
  return { channels: used };
}

export function buildShipmentBookedEmail(s: Shipment, publicTrackUrl: string): { subject: string; body: string; shortBody: string } {
  const itemsText = s.items.map((i) => `• ${i.quantity}× ${i.name} (${i.weightKg}kg)`).join("\n");
  const carrierLine = s.externalTrackingNumber
    ? `Carrier ref: ${s.externalTrackingNumber}${s.externalTrackingUrl ? ` (${s.externalTrackingUrl})` : ""}`
    : "";
  return {
    subject: `Shipment booked · Tracking ${s.trackingId}`,
    body: [
      `Hi ${s.drop.name},`,
      ``,
      `Your shipment has been booked with ${s.partnerName}.`,
      ``,
      `Tracking ID: ${s.trackingId}`,
      carrierLine,
      `Service: ${s.service.replace("_", " ")}`,
      `From: ${s.pickup.city}, ${s.pickup.postcode}`,
      `To:   ${s.drop.city}, ${s.drop.postcode}`,
      `Weight: ${s.weightKg.toFixed(1)} kg · Distance: ${s.distanceKm} km`,
      `Total: ${s.currency} ${s.price.toFixed(2)}`,
      ``,
      `Items:`,
      itemsText,
      ``,
      `Track your shipment live:`,
      publicTrackUrl,
      ``,
      `— AgriConnect Ship`,
    ].filter(Boolean).join("\n"),
    shortBody: `📦 ${s.partnerName} booked! Tracking ${s.trackingId}. Follow it live: ${publicTrackUrl}`,
  };
}
