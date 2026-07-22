export type E2eSupportRecipient = {
  enabled: boolean;
  keyId?: string;
  algorithm?: "RSA-OAEP-256/AES-256-GCM";
  publicKeyPem?: string;
};

export type EncryptedSupportMessage = {
  version: "agriconnect-e2e-v1";
  keyId: string;
  wrappedKey: string;
  iv: string;
  ciphertext: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem.replace(/\\n/g, "\n").replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, "");
  const binary = atob(body);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return bytes.buffer;
}

/** Encrypts in-browser. The private recipient key is never sent to AgriConnect. */
export async function encryptSupportMessage(message: string, recipient: E2eSupportRecipient): Promise<EncryptedSupportMessage> {
  if (!recipient.enabled || !recipient.keyId || !recipient.publicKeyPem) throw new Error("End-to-end support encryption is unavailable");
  if (!window.isSecureContext || !window.crypto?.subtle) throw new Error("End-to-end encryption requires a secure HTTPS connection");

  const recipientKey = await crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(recipient.publicKeyPem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const contentKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(message);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, contentKey, plaintext);
  const rawContentKey = await crypto.subtle.exportKey("raw", contentKey);
  const wrappedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, recipientKey, rawContentKey);

  return {
    version: "agriconnect-e2e-v1",
    keyId: recipient.keyId,
    wrappedKey: bytesToBase64(new Uint8Array(wrappedKey)),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}
