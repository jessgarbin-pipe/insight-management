import { Hono } from "hono";
import { ulid } from "ulid";
import type { AppEnv } from "../types";
import { createDb } from "../db/client";
import { themes, insightThemes } from "../db/schema";
import { eq, sql } from "drizzle-orm";

const app = new Hono<AppEnv>();

// List all themes with insight counts
app.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const statusFilter = c.req.query("status");

  const rows = await db
    .select({
      id: themes.id,
      name: themes.name,
      description: themes.description,
      origin: themes.origin,
      status: themes.status,
      color: themes.color,
      createdAt: themes.createdAt,
      insightCount: sql<number>`(
        SELECT COUNT(*) FROM insight_themes WHERE theme_id = themes.id
      )`,
    })
    .from(themes)
    .where(statusFilter ? eq(themes.status, statusFilter as "active" | "pending_review" | "archived") : undefined)
    .orderBy(sql`(SELECT COUNT(*) FROM insight_themes WHERE theme_id = themes.id) DESC`);

  return c.json({ data: rows });
});

// Create theme
app.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json<{
    name: string;
    description?: string;
    color?: string;
  }>();

  if (!body.name) {
    return c.json({ error: "name is required" }, 400);
  }

  const id = ulid();
  await db.insert(themes).values({
    id,
    name: body.name,
    description: body.description || null,
    origin: "user_created",
    status: "active",
    color: body.color || null,
    createdAt: new Date(),
  });

  return c.json({ id, name: body.name }, 201);
});

// Update theme
app.patch("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    description?: string;
    status?: string;
    color?: string;
  }>();

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status) updates.status = body.status;
  if (body.color !== undefined) updates.color = body.color;

  await db.update(themes).set(updates).where(eq(themes.id, id));

  return c.json({ ok: true });
});

// Approve AI-suggested theme
app.post("/:id/approve", async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  await db
    .update(themes)
    .set({ status: "active" })
    .where(eq(themes.id, id));

  return c.json({ ok: true, message: "Theme approved and active." });
});

export { app as themesRoutes };
