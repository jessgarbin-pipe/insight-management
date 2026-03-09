import { Hono } from "hono";
import { ulid } from "ulid";
import type { AppEnv } from "../types";
import { createDb } from "../db/client";
import { insights, themes, insightThemes, classificationLog } from "../db/schema";
import { apiKeyAuth } from "../middleware/api-key";
import { classifyInsight, normalizeContent } from "../services/classifier";
import { eq, like } from "drizzle-orm";

const app = new Hono<AppEnv>();

// All ingest routes require API key
app.use("/*", apiKeyAuth);

// Generic webhook ingest
app.post("/webhook", async (c) => {
  const body = await c.req.json<{
    content: string;
    source?: string;
    customer?: string;
    company?: string;
    metadata?: Record<string, unknown>;
  }>();

  if (!body.content || body.content.trim().length === 0) {
    return c.json({ error: "content is required" }, 400);
  }

  const db = createDb(c.env.DB);
  const insightId = ulid();
  const normalized = normalizeContent(body.content);

  // Check for exact duplicate (normalized content)
  const [existing] = await db
    .select({ id: insights.id })
    .from(insights)
    .where(like(insights.contentNormalized, normalized))
    .limit(1);

  if (existing) {
    return c.json({
      id: existing.id,
      status: "duplicate",
      message: "An insight with similar content already exists.",
      duplicateOfId: existing.id,
    });
  }

  // Insert the insight
  const now = new Date();
  await db.insert(insights).values({
    id: insightId,
    content: body.content.trim(),
    contentNormalized: normalized,
    source: "api",
    sourceMetadata: body.metadata || null,
    customerName: body.customer || null,
    customerCompany: body.company || null,
    status: "new",
    createdAt: now,
    updatedAt: now,
  });

  // Classify with AI (async-ish — we do it inline for now)
  try {
    const activeThemes = await db
      .select({ id: themes.id, name: themes.name, description: themes.description })
      .from(themes)
      .where(eq(themes.status, "active"));

    const classification = await classifyInsight(
      body.content,
      activeThemes,
      c.env.CLAUDE_API_KEY
    );

    // Update insight with classification results
    await db
      .update(insights)
      .set({
        sentiment: classification.sentiment,
        sentimentScore: classification.sentimentScore,
        importance: classification.importance,
        aiSummary: classification.summary,
        aiConfidence: classification.themes[0]?.confidence || 0,
        status: "classified",
        updatedAt: new Date(),
      })
      .where(eq(insights.id, insightId));

    // Create theme associations
    for (const theme of classification.themes) {
      await db.insert(insightThemes).values({
        insightId: insightId,
        themeId: theme.themeId,
        confidence: theme.confidence,
        isPrimary: theme.isPrimary,
        assignedBy: "ai",
      });
    }

    // Handle suggested new theme
    if (classification.suggestedNewTheme) {
      const newThemeId = ulid();
      await db.insert(themes).values({
        id: newThemeId,
        name: classification.suggestedNewTheme.name,
        description: classification.suggestedNewTheme.description,
        origin: "ai_suggested",
        status: "pending_review",
        createdAt: new Date(),
      });

      await db.insert(insightThemes).values({
        insightId: insightId,
        themeId: newThemeId,
        confidence: 80,
        isPrimary: classification.themes.length === 0,
        assignedBy: "ai",
      });

      // Log theme suggestion
      await db.insert(classificationLog).values({
        id: ulid(),
        insightId: insightId,
        action: "theme_suggested",
        output: classification.suggestedNewTheme,
        modelUsed: "claude-sonnet-4-20250514",
        tokensUsed:
          (classification as ClassificationResultWithTokens)._tokensUsed || null,
        createdAt: new Date(),
      });
    }

    // Log classification
    await db.insert(classificationLog).values({
      id: ulid(),
      insightId: insightId,
      action: "classified",
      output: classification,
      modelUsed: "claude-sonnet-4-20250514",
      tokensUsed:
        (classification as ClassificationResultWithTokens)._tokensUsed || null,
      createdAt: new Date(),
    });

    return c.json({
      id: insightId,
      status: "classified",
      classification: {
        themes: classification.themes,
        sentiment: classification.sentiment,
        importance: classification.importance,
        summary: classification.summary,
        suggestedNewTheme: classification.suggestedNewTheme || null,
      },
    }, 201);
  } catch (err) {
    // Classification failed but insight is saved
    console.error("Classification error:", err);
    return c.json({
      id: insightId,
      status: "new",
      message: "Insight saved but classification failed. Will retry later.",
      error: err instanceof Error ? err.message : "Unknown error",
    }, 201);
  }
});

// Slack Events API endpoint
app.post("/slack", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();

  // Handle Slack URL verification challenge
  if (body.type === "url_verification") {
    return c.json({ challenge: body.challenge });
  }

  // Handle event callbacks
  if (body.type === "event_callback") {
    const event = body.event as {
      type: string;
      text?: string;
      user?: string;
      channel?: string;
      ts?: string;
    };

    if (event.type === "message" && event.text) {
      const db = createDb(c.env.DB);
      const insightId = ulid();
      const normalized = normalizeContent(event.text);
      const now = new Date();

      await db.insert(insights).values({
        id: insightId,
        content: event.text,
        contentNormalized: normalized,
        source: "slack",
        sourceMetadata: {
          slackUserId: event.user,
          slackChannel: event.channel,
          slackTs: event.ts,
        },
        status: "new",
        createdAt: now,
        updatedAt: now,
      });

      // Classify asynchronously via waitUntil if available
      const activeThemes = await db
        .select({ id: themes.id, name: themes.name, description: themes.description })
        .from(themes)
        .where(eq(themes.status, "active"));

      try {
        const classification = await classifyInsight(
          event.text,
          activeThemes,
          c.env.CLAUDE_API_KEY
        );

        await db
          .update(insights)
          .set({
            sentiment: classification.sentiment,
            sentimentScore: classification.sentimentScore,
            importance: classification.importance,
            aiSummary: classification.summary,
            aiConfidence: classification.themes[0]?.confidence || 0,
            status: "classified",
            updatedAt: new Date(),
          })
          .where(eq(insights.id, insightId));

        for (const theme of classification.themes) {
          await db.insert(insightThemes).values({
            insightId: insightId,
            themeId: theme.themeId,
            confidence: theme.confidence,
            isPrimary: theme.isPrimary,
            assignedBy: "ai",
          });
        }

        await db.insert(classificationLog).values({
          id: ulid(),
          insightId: insightId,
          action: "classified",
          output: classification,
          modelUsed: "claude-sonnet-4-20250514",
          createdAt: new Date(),
        });
      } catch (err) {
        console.error("Slack insight classification error:", err);
      }
    }

    return c.json({ ok: true });
  }

  return c.json({ ok: true });
});

// Batch ingest (for CSV import results)
app.post("/batch", async (c) => {
  const body = await c.req.json<{
    insights: Array<{
      content: string;
      customer?: string;
      company?: string;
      metadata?: Record<string, unknown>;
    }>;
  }>();

  if (!body.insights || !Array.isArray(body.insights) || body.insights.length === 0) {
    return c.json({ error: "insights array is required" }, 400);
  }

  if (body.insights.length > 100) {
    return c.json({ error: "Maximum 100 insights per batch" }, 400);
  }

  const db = createDb(c.env.DB);
  const activeThemes = await db
    .select({ id: themes.id, name: themes.name, description: themes.description })
    .from(themes)
    .where(eq(themes.status, "active"));

  const results: Array<{ id: string; status: string; summary?: string }> = [];

  for (const item of body.insights) {
    if (!item.content || item.content.trim().length === 0) {
      results.push({ id: "", status: "skipped" });
      continue;
    }

    const insightId = ulid();
    const normalized = normalizeContent(item.content);
    const now = new Date();

    await db.insert(insights).values({
      id: insightId,
      content: item.content.trim(),
      contentNormalized: normalized,
      source: "csv_import",
      sourceMetadata: item.metadata || null,
      customerName: item.customer || null,
      customerCompany: item.company || null,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    try {
      const classification = await classifyInsight(
        item.content,
        activeThemes,
        c.env.CLAUDE_API_KEY
      );

      await db
        .update(insights)
        .set({
          sentiment: classification.sentiment,
          sentimentScore: classification.sentimentScore,
          importance: classification.importance,
          aiSummary: classification.summary,
          aiConfidence: classification.themes[0]?.confidence || 0,
          status: "classified",
          updatedAt: new Date(),
        })
        .where(eq(insights.id, insightId));

      for (const theme of classification.themes) {
        await db.insert(insightThemes).values({
          insightId: insightId,
          themeId: theme.themeId,
          confidence: theme.confidence,
          isPrimary: theme.isPrimary,
          assignedBy: "ai",
        });
      }

      await db.insert(classificationLog).values({
        id: ulid(),
        insightId: insightId,
        action: "classified",
        output: classification,
        modelUsed: "claude-sonnet-4-20250514",
        createdAt: new Date(),
      });

      results.push({ id: insightId, status: "classified", summary: classification.summary });
    } catch (err) {
      console.error(`Batch classification error for insight ${insightId}:`, err);
      results.push({ id: insightId, status: "saved_unclassified" });
    }
  }

  return c.json({
    total: body.insights.length,
    classified: results.filter((r) => r.status === "classified").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "saved_unclassified").length,
    results,
  });
});

type ClassificationResultWithTokens = { _tokensUsed?: number };

export { app as ingestRoutes };
