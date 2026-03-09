import { Hono } from "hono";
import { ulid } from "ulid";
import type { AppEnv } from "../types";
import { createDb } from "../db/client";
import { apiKeys } from "../db/schema";
import { adminAuth, hashKey } from "../middleware/api-key";

const app = new Hono<AppEnv>();

app.use("/*", adminAuth);

// Generate a new API key
app.post("/api-keys", async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json<{ name: string }>();

  if (!body.name) {
    return c.json({ error: "name is required" }, 400);
  }

  // Generate a random API key
  const rawKey = `im_${crypto.randomUUID().replace(/-/g, "")}`;
  const keyHash = await hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 10);
  const id = ulid();

  await db.insert(apiKeys).values({
    id,
    name: body.name,
    keyHash,
    keyPrefix,
    isActive: true,
    createdAt: new Date(),
  });

  return c.json({
    id,
    name: body.name,
    key: rawKey,
    prefix: keyPrefix,
    message: "Save this key — it won't be shown again.",
  }, 201);
});

// List API keys (without showing the full key)
app.get("/api-keys", async (c) => {
  const db = createDb(c.env.DB);
  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.keyPrefix,
      isActive: apiKeys.isActive,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys);

  return c.json({ data: keys });
});

export { app as adminRoutes };
