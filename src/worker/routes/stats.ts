import { Hono } from "hono";
import type { AppEnv } from "../types";
import { createDb } from "../db/client";
import { insights, insightThemes, themes } from "../db/schema";
import { sql, eq } from "drizzle-orm";

const app = new Hono<AppEnv>();

// Dashboard summary
app.get("/summary", async (c) => {
  const db = createDb(c.env.DB);

  const [totals] = await db
    .select({ count: sql<number>`count(*)` })
    .from(insights);

  const bySource = await db
    .select({
      source: insights.source,
      count: sql<number>`count(*)`,
    })
    .from(insights)
    .groupBy(insights.source);

  const bySentiment = await db
    .select({
      sentiment: insights.sentiment,
      count: sql<number>`count(*)`,
    })
    .from(insights)
    .groupBy(insights.sentiment);

  const byImportance = await db
    .select({
      importance: insights.importance,
      count: sql<number>`count(*)`,
    })
    .from(insights)
    .groupBy(insights.importance);

  const byStatus = await db
    .select({
      status: insights.status,
      count: sql<number>`count(*)`,
    })
    .from(insights)
    .groupBy(insights.status);

  const topThemes = await db
    .select({
      themeId: insightThemes.themeId,
      themeName: themes.name,
      themeColor: themes.color,
      count: sql<number>`count(*)`,
    })
    .from(insightThemes)
    .innerJoin(themes, eq(insightThemes.themeId, themes.id))
    .groupBy(insightThemes.themeId)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  return c.json({
    total: totals.count,
    bySource,
    bySentiment,
    byImportance,
    byStatus,
    topThemes,
  });
});

export { app as statsRoutes };
