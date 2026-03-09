import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";
import { createDb } from "../db/client";
import { apiKeys } from "../db/schema";
import { eq } from "drizzle-orm";

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export { hashKey };

export const apiKeyAuth = createMiddleware<AppEnv>(async (c, next) => {
  const key = c.req.header("X-API-Key");
  if (!key) {
    return c.json({ error: "API key required. Pass via X-API-Key header." }, 401);
  }

  const db = createDb(c.env.DB);
  const keyHash = await hashKey(key);

  const [found] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!found || !found.isActive) {
    return c.json({ error: "Invalid or inactive API key." }, 403);
  }

  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, found.id));

  c.set("apiKeyName", found.name);
  await next();
});

export const adminAuth = createMiddleware<AppEnv>(async (c, next) => {
  const key = c.req.header("X-API-Key");
  if (!key || key !== c.env.ADMIN_API_KEY) {
    return c.json({ error: "Admin access required." }, 403);
  }
  await next();
});
