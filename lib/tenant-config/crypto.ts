import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Derives a consistent 32-byte cryptographic key from environment secrets.
 */
function getMasterKey(): Buffer {
  const secretSource =
    process.env.TENANT_CONFIG_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "wealthos-tenant-secure-default-key-32b";
  return crypto.createHash("sha256").update(secretSource).digest();
}

/**
 * Encrypts a sensitive string using AES-256-GCM.
 * Output format: `ivHex:tagHex:cipherHex`
 */
export function encryptValue(plaintext: string): string {
  if (!plaintext || typeof plaintext !== "string") return "";

  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string (`ivHex:tagHex:cipherHex`).
 * Returns plaintext or null if decryption / authentication tag fails.
 */
export function decryptValue(encryptedPayload: string): string | null {
  if (!encryptedPayload || typeof encryptedPayload !== "string") return null;

  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    // If not in encrypted format (e.g. legacy plain text), return as-is or null
    return null;
  }

  try {
    const [ivHex, tagHex, cipherHex] = parts;
    const key = getMasterKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const ciphertext = Buffer.from(cipherHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: TAG_LENGTH,
    });
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (err) {
    console.error("Failed to decrypt tenant secret:", err);
    return null;
  }
}

/**
 * Checks whether a given string is in the `iv:tag:cipher` encrypted format.
 */
export function isEncryptedValue(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const parts = value.split(":");
  return (
    parts.length === 3 &&
    parts[0].length === IV_LENGTH * 2 &&
    parts[1].length === TAG_LENGTH * 2 &&
    parts[2].length > 0
  );
}

/**
 * Encrypts a key-value dictionary of environment variables.
 * Values that are already encrypted are preserved to prevent double-encryption.
 */
export function encryptEnvMap(
  envVars: Record<string, string | null | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(envVars)) {
    if (value === null || value === undefined || value.trim() === "") continue;
    const trimmed = value.trim();
    if (isEncryptedValue(trimmed)) {
      result[key] = trimmed;
    } else {
      result[key] = encryptValue(trimmed);
    }
  }

  return result;
}

/**
 * Decrypts a dictionary of encrypted environment variables into plaintext.
 */
export function decryptEnvMap(
  encryptedMap: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, encValue] of Object.entries(encryptedMap || {})) {
    if (!encValue) continue;
    const decrypted = decryptValue(encValue);
    if (decrypted !== null) {
      result[key] = decrypted;
    }
  }

  return result;
}

/**
 * Safely masks a secret string for UI presentation (e.g. `••••••••5a2b`).
 */
export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 4) return "••••";
  const last4 = secret.slice(-4);
  return `••••••••${last4}`;
}

