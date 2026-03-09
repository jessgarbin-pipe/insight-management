import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";

export const themes = sqliteTable(
  "themes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    description: text("description"),
    origin: text("origin", {
      enum: ["predefined", "ai_suggested", "user_created"],
    })
      .notNull()
      .default("predefined"),
    status: text("status", {
      enum: ["active", "pending_review", "archived"],
    })
      .notNull()
      .default("active"),
    color: text("color"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("idx_themes_status").on(table.status)]
);

export const insights = sqliteTable(
  "insights",
  {
    id: text("id").primaryKey(),
    content: text("content").notNull(),
    contentNormalized: text("content_normalized"),
    source: text("source", {
      enum: ["slack", "api", "csv_import"],
    }).notNull(),
    sourceMetadata: text("source_metadata", { mode: "json" }),
    customerName: text("customer_name"),
    customerCompany: text("customer_company"),
    sentiment: text("sentiment", {
      enum: ["positive", "negative", "neutral", "mixed"],
    }),
    sentimentScore: integer("sentiment_score"),
    importance: text("importance", {
      enum: ["critical", "high", "medium", "low"],
    }).default("medium"),
    status: text("status", {
      enum: ["new", "classified", "reviewed", "actioned", "archived"],
    })
      .notNull()
      .default("new"),
    aiSummary: text("ai_summary"),
    aiConfidence: integer("ai_confidence"),
    duplicateOfId: text("duplicate_of_id"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_insights_source").on(table.source),
    index("idx_insights_status").on(table.status),
    index("idx_insights_sentiment").on(table.sentiment),
    index("idx_insights_created_at").on(table.createdAt),
    index("idx_insights_customer_company").on(table.customerCompany),
  ]
);

export const insightThemes = sqliteTable(
  "insight_themes",
  {
    insightId: text("insight_id")
      .notNull()
      .references(() => insights.id),
    themeId: text("theme_id")
      .notNull()
      .references(() => themes.id),
    confidence: integer("confidence"),
    isPrimary: integer("is_primary", { mode: "boolean" }).default(false),
    assignedBy: text("assigned_by", { enum: ["ai", "user"] })
      .notNull()
      .default("ai"),
  },
  (table) => [
    primaryKey({ columns: [table.insightId, table.themeId] }),
    index("idx_insight_themes_theme").on(table.themeId),
  ]
);

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insightTags = sqliteTable(
  "insight_tags",
  {
    insightId: text("insight_id")
      .notNull()
      .references(() => insights.id),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (table) => [primaryKey({ columns: [table.insightId, table.tagId] })]
);

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const classificationLog = sqliteTable(
  "classification_log",
  {
    id: text("id").primaryKey(),
    insightId: text("insight_id")
      .notNull()
      .references(() => insights.id),
    action: text("action", {
      enum: [
        "classified",
        "theme_suggested",
        "duplicate_detected",
        "reclassified",
      ],
    }).notNull(),
    output: text("output", { mode: "json" }),
    modelUsed: text("model_used"),
    tokensUsed: integer("tokens_used"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("idx_classification_log_insight").on(table.insightId)]
);
