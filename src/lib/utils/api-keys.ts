import crypto from "crypto";

/**
 * Generate a new API key with the sk_ prefix.
 * Returns the raw key (to show once) and its SHA-256 hash (to store).
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(32).toString("hex");
  const key = `sk_${random}`;
  const hash = hashApiKey(key);
  const prefix = key.slice(0, 8);
  return { key, hash, prefix };
}

/**
 * Hash an API key using SHA-256 for storage.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}
