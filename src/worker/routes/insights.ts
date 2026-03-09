import { Hono } from "hono";
import type { AppEnv } from "../types";
import { createDb } from "../db/client";
import { insights, insightThemes, themes } from "../db/schema";
import { eq, desc, like, and, gte, lte, sql, inArray } from "drizzle-orm";

const app = new Hono<AppEnv>();

// List insights with filters and pagination
app.get("/", async (c) => {
  const db = createDb(c.env.DB);

  const page = parseInt(c.req.query("page") || "1");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const offset = (page - 1) * limit;

  const themeFilter = c.req.query("theme");
  const sourceFilter = c.req.query("source");
  const sentimentFilter = c.req.query("sentiment");
  const statusFilter = c.req.query("status");
  const searchQuery = c.req.query("search");
  const fromDate = c.req.query("from");
  const toDate = c.req.query("to");
  const importanceFilter = c.req.query("importance");

  // Build conditions
  const conditions = [];

  if (sourceFilter) {
    conditions.push(eq(insights.source, sourceFilter as "slack" | "api" | "csv_import"));
  }
  if (sentimentFilter) {
    conditions.push(eq(insights.sentiment, sentimentFilter as "positive" | "negative" | "neutral" | "mixed"));
  }
  if (statusFilter) {
    conditions.push(eq(insights.status, statusFilter as "new" | "classified" | "reviewed" | "actioned" | "archived"));
  }
  if (importanceFilter) {
    conditions.push(eq(insights.importance, importanceFilter as "critical" | "high" | "medium" | "low"));
  }
  if (searchQuery) {
    conditions.push(like(insights.contentNormalized, `%${searchQuery.toLowerCase()}%`));
  }
  if (fromDate) {
    conditions.push(gte(insights.createdAt, new Date(fromDate)));
  }
  if (toDate) {
    conditions.push(lte(insights.createdAt, new Date(toDate)));
  }

  // If theme filter, get insight IDs first
  let themeInsightIds: string[] | null = null;
  if (themeFilter) {
    const themeInsights = await db
      .select({ insightId: insightThemes.insightId })
      .from(insightThemes)
      .where(eq(insightThemes.themeId, themeFilter));
    themeInsightIds = themeInsights.map((r) => r.insightId);

    if (themeInsightIds.length === 0) {
      return c.json({ data: [], total: 0, page, limit });
    }
    conditions.push(inArray(insights.id, themeInsightIds));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(insights)
    .where(whereClause);

  // Fetch insights
  const rows = await db
    .select()
    .from(insights)
    .where(whereClause)
    .orderBy(desc(insights.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch themes for each insight
  const insightIds = rows.map((r) => r.id);
  let themeMap: Record<string, Array<{ themeId: string; themeName: string; confidence: number | null; isPrimary: boolean | null }>> = {};

  if (insightIds.length > 0) {
    const themeRows = await db
      .select({
        insightId: insightThemes.insightId,
        themeId: insightThemes.themeId,
        themeName: themes.name,
        themeColor: themes.color,
        confidence: insightThemes.confidence,
        isPrimary: insightThemes.isPrimary,
      })
      .from(insightThemes)
      .innerJoin(themes, eq(insightThemes.themeId, themes.id))
      .where(inArray(insightThemes.insightId, insightIds));

    for (const row of themeRows) {
      if (!themeMap[row.insightId]) themeMap[row.insightId] = [];
      themeMap[row.insightId].push({
        themeId: row.themeId,
        themeName: row.themeName,
        confidence: row.confidence,
        isPrimary: row.isPrimary,
      });
    }
  }

  const data = rows.map((row) => ({
    ...row,
    themes: themeMap[row.id] || [],
  }));

  return c.json({ data, total: count, page, limit });
});

// Get single insight with full details
app.get("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  const [insight] = await db
    .select()
    .from(insights)
    .where(eq(insights.id, id))
    .limit(1);

  if (!insight) {
    return c.json({ error: "Insight not found" }, 404);
  }

  const themeRows = await db
    .select({
      themeId: insightThemes.themeId,
      themeName: themes.name,
      themeColor: themes.color,
      themeDescription: themes.description,
      confidence: insightThemes.confidence,
      isPrimary: insightThemes.isPrimary,
      assignedBy: insightThemes.assignedBy,
    })
    .from(insightThemes)
    .innerJoin(themes, eq(insightThemes.themeId, themes.id))
    .where(eq(insightThemes.insightId, id));

  return c.json({
    ...insight,
    themes: themeRows,
  });
});

// Update insight (status, importance, etc.)
app.patch("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param("id");
  const body = await c.req.json<{
    status?: string;
    importance?: string;
  }>();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status) updates.status = body.status;
  if (body.importance) updates.importance = body.importance;

  await db.update(insights).set(updates).where(eq(insights.id, id));

  return c.json({ ok: true });
});

export { app as insightsRoutes };
