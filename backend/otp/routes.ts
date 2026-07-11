import type { Express, Request } from "express";
import { z, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { checkSendRateLimit, generateOtp, verifyOtp } from "./service";
import { isSmsConfigured, sendSms } from "./sms";
import { authStorage } from "../auth/storage";
import { regenerateSessionPreservingGuestCart } from "../auth";

const sendOtpSchema = z.object({
  phone: z.string().min(8).max(20).regex(/^\+?[\d\s\-()]+$/, "Invalid phone number"),
  email: z.string().email().optional(),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().length(6),
});

async function sendOtpViaSendGrid(toEmail: string, code: string, ttlMs: number): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@agriconnect.app";
  if (!apiKey) return false;
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: fromEmail, name: "AgriConnect" },
        subject: "Your AgriConnect login code",
        content: [
          {
            type: "text/html",
            value: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
              <h2 style="color:#16a34a;">AgriConnect</h2>
              <p>Your one-time login code is:</p>
              <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;
                          padding:16px;background:#f0fdf4;border-radius:8px;color:#16a34a;">
                ${code}
              </div>
              <p style="color:#666;">Valid for ${ttlMs / 1000 / 60} minutes.</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
              <p style="color:#999;font-size:12px;">If you did not request this code, ignore this email.</p>
            </div>`,
          },
        ],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function registerOtpRoutes(app: Express): void {
  app.post("/api/auth/otp/send", async (req, res) => {
    try {
      const { phone, email: reqEmail } = sendOtpSchema.parse(req.body);

      const allowed = await checkSendRateLimit(phone);
      if (!allowed) {
        const retryAfter = Math.ceil(30);
        return res.status(429).json({
          message: `Too many requests. Try again in ${retryAfter} minutes.`,
        });
      }

      const { code, ttlMs } = await generateOtp(phone);
      const hasSms = isSmsConfigured();
      const hasSendGrid = !!process.env.SENDGRID_API_KEY;
      let delivered = false;
      let deliveryAttempted = false;

      if (hasSms) {
        deliveryAttempted = true;
        const message = `Your AgriConnect OTP is: ${code}. Valid for ${ttlMs / 1000 / 60} minutes.`;
        const smsResult = await sendSms(phone, message);
        if (smsResult.success) delivered = true;
      }

      if (!delivered) {
        const existingUser = await authStorage.getUserByPhone(phone);
        const targetEmail = reqEmail || existingUser?.email || undefined;
        if (targetEmail && hasSendGrid) {
          deliveryAttempted = true;
          delivered = await sendOtpViaSendGrid(targetEmail, code, ttlMs);
        }
      }

      const isProduction = process.env.NODE_ENV === "production";

      if (!delivered) {
        if (isProduction) {
          return res.status(500).json({
            message: deliveryAttempted
              ? "Failed to send OTP. Please try again."
              : "Failed to send OTP. No delivery channel configured.",
          });
        }
        console.log(`[otp:dev] Code for ${phone}: ${code}`);
      }

      res.json({
        message: delivered ? "OTP sent" : "OTP sent (dev mode)",
        ttlMs,
        ...(isProduction || delivered ? {} : { devCode: code }),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error sending OTP:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/otp/verify", async (req, res) => {
    try {
      const { phone, code } = verifyOtpSchema.parse(req.body);
      const result = await verifyOtp(phone, code);

      if (!result.valid) {
        if (result.reason === "max_attempts") {
          return res.status(429).json({
            message: "Too many incorrect attempts. Please request a new OTP.",
          });
        }
        if (result.reason === "expired") {
          return res.status(401).json({ message: "OTP has expired. Please request a new one." });
        }
        return res.status(401).json({ message: "Invalid or expired OTP" });
      }

      let user = await authStorage.getUserByPhone(phone);
      if (!user) {
        user = await authStorage.createUser({
          phone,
          authMethod: "otp",
          profileComplete: false,
        });
      }

      // Regenerate session to prevent session fixation.
      await regenerateSessionPreservingGuestCart(req);
      req.session.userId = user.id;

      const { passwordHash: _, ...safeUser } = user;
      res.json({ user: safeUser, isNewUser: !user.profileComplete });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });
}
