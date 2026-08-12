import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import {
  savedAddressDetailsSchema,
  type SavedAddressDetails,
} from "@shared/schema";

const ADDRESS_KEY_VERSION = 1;
const ADDRESS_CIPHER = "aes-256-gcm";

export class AddressEncryptionConfigurationError extends Error {
  constructor() {
    super("Saved-address encryption is not configured");
    this.name = "AddressEncryptionConfigurationError";
  }
}

function addressKey(): Buffer {
  const keyMaterial =
    process.env.ADDRESS_ENCRYPTION_KEY?.trim() ||
    process.env.SESSION_SECRET?.trim();
  if (!keyMaterial) throw new AddressEncryptionConfigurationError();

  return createHash("sha256")
    .update("agriconnect:user-addresses:v1:", "utf8")
    .update(keyMaterial, "utf8")
    .digest();
}

function associatedData(userId: string, addressId: string): Buffer {
  return Buffer.from(`user-address:${userId}:${addressId}:v${ADDRESS_KEY_VERSION}`, "utf8");
}

export function encryptAddress(
  details: SavedAddressDetails,
  userId: string,
  addressId: string,
): { encryptedPayload: string; encryptionKeyVersion: number } {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ADDRESS_CIPHER, addressKey(), iv);
  cipher.setAAD(associatedData(userId, addressId));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(details), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedPayload: [
      `v${ADDRESS_KEY_VERSION}`,
      iv.toString("base64url"),
      authTag.toString("base64url"),
      ciphertext.toString("base64url"),
    ].join("."),
    encryptionKeyVersion: ADDRESS_KEY_VERSION,
  };
}

export function decryptAddress(
  encryptedPayload: string,
  encryptionKeyVersion: number,
  userId: string,
  addressId: string,
): SavedAddressDetails {
  if (encryptionKeyVersion !== ADDRESS_KEY_VERSION) {
    throw new Error("Unsupported saved-address encryption key version");
  }
  const [version, ivValue, tagValue, ciphertextValue] = encryptedPayload.split(".");
  if (version !== `v${ADDRESS_KEY_VERSION}` || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Saved-address payload is invalid");
  }

  const decipher = createDecipheriv(
    ADDRESS_CIPHER,
    addressKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAAD(associatedData(userId, addressId));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");

  return savedAddressDetailsSchema.parse(JSON.parse(plaintext));
}

