import { createCipheriv, createHash, createHmac, randomBytes } from "crypto";

function encryptionKey(): Buffer {
  const configured = process.env.SELLER_VERIFICATION_ENCRYPTION_KEY?.trim();
  if (configured) {
    const decoded = Buffer.from(configured, "base64");
    if (decoded.length !== 32) {
      throw new Error("SELLER_VERIFICATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
    }
    return decoded;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SELLER_VERIFICATION_ENCRYPTION_KEY is required in production");
  }
  return createHash("sha256")
    .update(process.env.SESSION_SECRET || "agriconnect-local-verification-key")
    .digest();
}

export function protectSensitiveValue(value: string): {
  encryptedValue: string;
  valueHash: string;
  maskedValue: string;
} {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const hashKey = process.env.SECURITY_AUDIT_HASH_KEY || process.env.SESSION_SECRET || "local-verification-hash";
  const visible = normalized.slice(-4);
  return {
    encryptedValue: ["v1", iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join("."),
    valueHash: createHmac("sha256", hashKey).update(normalized).digest("hex"),
    maskedValue: `${"•".repeat(Math.max(4, Math.min(12, normalized.length - visible.length)))}${visible}`,
  };
}
