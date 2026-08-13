import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const storageRoot = path.resolve(process.env.SELLER_DOCUMENT_STORAGE_PATH || path.join(process.cwd(), ".data", "seller-verification"));

function documentKey(): Buffer {
  const configured = process.env.SELLER_DOCUMENT_ENCRYPTION_KEY?.trim() || process.env.SELLER_VERIFICATION_ENCRYPTION_KEY?.trim();
  if (configured) {
    const decoded = Buffer.from(configured, "base64");
    if (decoded.length !== 32) throw new Error("SELLER_DOCUMENT_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
    return decoded;
  }
  if (process.env.NODE_ENV === "production") throw new Error("SELLER_DOCUMENT_ENCRYPTION_KEY is required in production");
  return createHash("sha256").update(process.env.SESSION_SECRET || "agriconnect-local-document-key").digest();
}

function encrypt(data: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", documentKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([Buffer.from("AGDOC1"), iv, cipher.getAuthTag(), ciphertext]);
}

function decrypt(data: Buffer): Buffer {
  if (data.subarray(0, 6).toString("ascii") !== "AGDOC1") throw new Error("Unsupported encrypted document format");
  const iv = data.subarray(6, 18);
  const tag = data.subarray(18, 34);
  const decipher = createDecipheriv("aes-256-gcm", documentKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data.subarray(34)), decipher.final()]);
}

const signatures: Record<string, (buffer: Buffer) => boolean> = {
  "application/pdf": (buffer) => buffer.subarray(0, 5).toString("ascii") === "%PDF-",
  "image/jpeg": (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  "image/png": (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (buffer) => buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP",
};

function safeKey(storageKey: string): string {
  if (!/^[a-f0-9-]+\/[a-f0-9-]+\.(bin)$/.test(storageKey)) throw new Error("Invalid document storage key");
  const target = path.resolve(storageRoot, storageKey);
  if (!target.startsWith(`${storageRoot}${path.sep}`)) throw new Error("Invalid document storage path");
  return target;
}

export interface SellerDocumentStorage {
  save(sellerId: string, contentType: string, data: Buffer): Promise<{ storageKey: string; sha256: string; sizeBytes: number }>;
  read(storageKey: string): Promise<Buffer>;
  remove(storageKey: string): Promise<void>;
}

class LocalPrivateDocumentStorage implements SellerDocumentStorage {
  async save(sellerId: string, contentType: string, data: Buffer) {
    if (!data.length || data.length > MAX_DOCUMENT_BYTES) throw new Error("Document must be between 1 byte and 5 MB");
    const matches = signatures[contentType]?.(data) ?? false;
    if (!matches) throw new Error("Document content does not match its declared file type");
    const storageKey = `${sellerId}/${randomUUID()}.bin`;
    const target = safeKey(storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, encrypt(data), { flag: "wx", mode: 0o600 });
    await rename(temporary, target);
    return { storageKey, sha256: createHash("sha256").update(data).digest("hex"), sizeBytes: data.length };
  }

  async read(storageKey: string) {
    return decrypt(await readFile(safeKey(storageKey)));
  }

  async remove(storageKey: string) {
    try { await unlink(safeKey(storageKey)); } catch (error: any) { if (error?.code !== "ENOENT") throw error; }
  }
}

// This interface is intentionally provider-neutral. A future S3/R2 adapter can
// replace the local private store without changing seller or operator APIs.
export const sellerDocumentStorage: SellerDocumentStorage = new LocalPrivateDocumentStorage();
export { MAX_DOCUMENT_BYTES };
