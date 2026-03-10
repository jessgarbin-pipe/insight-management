import type { Insight, Theme } from "@/lib/types";

// ---------------------------------------------------------------------------
// Layer 1: Combined classification + enrichment + scoring
// ---------------------------------------------------------------------------
export function layer1ProcessingPrompt(
  insight: { title: string; description: string; metadata: Record<string, unknown> },
  existingThemes: { name: string; description: string | null }[]
): { system: string; user: string } {
  const themeList =
    existingThemes.length > 0
      ? existingThemes
          .map((t) => `- "${t.name}"${t.description ? `: ${t.description}` : ""}`)
          .join("\n")
      : "(no existing themes yet)";

  const system = `You are an AI analyst that processes customer insights for a product management tool.

Your job is to analyze the given insight and return a structured JSON response with:
1. Theme classification (assign 1-3 themes)
2. Sentiment analysis
3. Urgency assessment
4. Type classification
5. Priority scoring (0-100)

EXISTING THEMES:
${themeList}

RULES:
- Prefer assigning to existing themes when the insight is clearly related.
- If no existing theme fits, suggest a new theme with a short description.
- For new themes, use title-case naming (e.g., "User Onboarding", "Pricing Concerns").
- An insight can belong to 1-3 themes.
- Priority score factors: urgency language, sentiment intensity, customer context (enterprise/high-value customers get a boost), frequency signal.

Respond ONLY with valid JSON matching this schema:
{
  "themes": [
    { "name": "string", "is_new": boolean, "description": "string (required if is_new is true, otherwise optional)" }
  ],
  "sentiment": "positive" | "negative" | "neutral",
  "urgency": "high" | "medium" | "low",
  "type": "bug" | "feature_request" | "praise" | "question",
  "priority_score": number (0-100),
  "priority_reasoning": "string (brief explanation)"
}`;

  const metadataStr =
    Object.keys(insight.metadata).length > 0
      ? `\nMetadata: ${JSON.stringify(insight.metadata)}`
      : "";

  const user = `Analyze this insight:

Title: ${insight.title}
Description: ${insight.description}${metadataStr}`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// Layer 2: Opportunity identification
// ---------------------------------------------------------------------------
export function layer2OpportunitiesPrompt(
  themes: {
    id: string;
    name: string;
    description: string | null;
    insight_count: number;
    insights: { title: string; description: string }[];
  }[]
): { system: string; user: string } {
  const system = `You are an AI analyst that identifies actionable product opportunities from grouped customer insights.

For each theme provided, analyze the underlying insights and identify concrete opportunities the product team should consider.

RULES:
- Only suggest opportunities that are clearly supported by the insight data.
- Each opportunity should have an estimated impact level.
- An opportunity should be actionable and specific.

Respond ONLY with valid JSON matching this schema:
{
  "opportunities": [
    {
      "title": "string",
      "description": "string",
      "estimated_impact": "high" | "medium" | "low",
      "theme_name": "string (the theme this opportunity comes from)",
      "supporting_insight_titles": ["string"]
    }
  ]
}`;

  const themeSummaries = themes
    .map((t) => {
      const insightBullets = t.insights
        .slice(0, 10)
        .map((i) => `  - "${i.title}": ${i.description.slice(0, 200)}`)
        .join("\n");
      return `Theme: "${t.name}" (${t.insight_count} insights)\nDescription: ${t.description || "N/A"}\nSample insights:\n${insightBullets}`;
    })
    .join("\n\n");

  const user = `Identify opportunities from these theme clusters:\n\n${themeSummaries}`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// Layer 3: Briefing generation
// ---------------------------------------------------------------------------
export function briefingPrompt(context: {
  newInsights: { title: string; id: string; source: string; priority_score: number | null }[];
  trendChanges: { name: string; trend: string; insight_count: number }[];
  newOpportunities: { title: string; estimated_impact: string | null; theme_id: string | null }[];
  highPriorityItems: { id: string; title: string; priority_score: number | null; status: string }[];
  recentActions: { action_type: string; details: Record<string, unknown>; theme_id: string | null }[];
}): { system: string; user: string } {
  const system = `You are an AI executive briefing assistant for a product insight management tool.

Generate a concise daily briefing for a product manager. The briefing should:
1. Summarize what changed since the last review (2-3 sentences).
2. List action items ordered by priority, each with a suggested action.

ADAPTIVE BEHAVIOR:
- If the manager frequently dismisses certain theme types, deprioritize them.
- If the manager frequently accepts certain theme types, boost their priority.

Each action item must have a suggested_action with one of these types:
- "change_status": Suggest changing an insight's status. params: { "insight_id": "uuid", "new_status": "related|closed|archived" }
- "create_opportunity": Suggest creating an opportunity from a theme. params: { "theme_id": "uuid", "title": "string" }
- "link_to_opportunity": Suggest linking insights to an opportunity. params: { "insight_ids": ["uuid"], "opportunity_id": "uuid" }
- "archive_theme": Suggest archiving a declining theme. params: { "theme_id": "uuid" }
- "investigate": Suggest investigating a high-priority insight. params: { "insight_id": "uuid" }

Respond ONLY with valid JSON matching this schema:
{
  "summary": "string (2-3 sentence executive summary)",
  "items": [
    {
      "id": "string (generate a unique id like briefing-item-1)",
      "description": "string",
      "suggested_action": {
        "label": "string (human-readable action label)",
        "type": "change_status" | "create_opportunity" | "link_to_opportunity" | "archive_theme" | "investigate",
        "params": { ... }
      },
      "related_insight_ids": ["string"],
      "priority": number (1 = highest)
    }
  ]
}`;

  const sections: string[] = [];

  if (context.newInsights.length > 0) {
    sections.push(
      `NEW INSIGHTS (${context.newInsights.length}):\n` +
        context.newInsights
          .slice(0, 20)
          .map((i) => `- [${i.id}] "${i.title}" (source: ${i.source}, score: ${i.priority_score ?? "N/A"})`)
          .join("\n")
    );
  }

  if (context.trendChanges.length > 0) {
    sections.push(
      `THEME TREND CHANGES:\n` +
        context.trendChanges
          .map((t) => `- "${t.name}": ${t.trend} (${t.insight_count} insights)`)
          .join("\n")
    );
  }

  if (context.newOpportunities.length > 0) {
    sections.push(
      `NEW/UPDATED OPPORTUNITIES:\n` +
        context.newOpportunities
          .map((o) => `- "${o.title}" (impact: ${o.estimated_impact ?? "N/A"})`)
          .join("\n")
    );
  }

  if (context.highPriorityItems.length > 0) {
    sections.push(
      `UNRESOLVED HIGH-PRIORITY ITEMS:\n` +
        context.highPriorityItems
          .slice(0, 15)
          .map((i) => `- [${i.id}] "${i.title}" (score: ${i.priority_score}, status: ${i.status})`)
          .join("\n")
    );
  }

  if (context.recentActions.length > 0) {
    const actionSummary = context.recentActions.reduce(
      (acc, a) => {
        acc[a.action_type] = (acc[a.action_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    sections.push(
      `RECENT MANAGER ACTIONS:\n` +
        Object.entries(actionSummary)
          .map(([type, count]) => `- ${type}: ${count} times`)
          .join("\n")
    );
  }

  const user =
    sections.length > 0
      ? `Generate a briefing based on this context:\n\n${sections.join("\n\n")}`
      : `There is no new activity to report. Generate a brief "all clear" briefing.`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// Layer 3: Ask question (returns prose, not JSON)
// ---------------------------------------------------------------------------
export function askPrompt(
  question: string,
  relevantInsights: { id: string; title: string; description: string; source: string; sentiment: string | null }[]
): { system: string; user: string } {
  const system = `You are an AI assistant for a product insight management tool. Answer the user's question based ONLY on the provided insight data.

RULES:
- Ground your answer in the specific insights provided. Do not make up data.
- Reference insights by their exact title when citing them.
- If the data does not contain relevant information, say so clearly.
- Provide a concise, actionable answer.
- Format your answer as prose with clear paragraphs.`;

  const insightContext = relevantInsights
    .map(
      (i) =>
        `[${i.title}] (source: ${i.source}, sentiment: ${i.sentiment ?? "unknown"})\n${i.description}`
    )
    .join("\n\n---\n\n");

  const user = relevantInsights.length > 0
    ? `Question: ${question}\n\nRelevant insights (${relevantInsights.length} found):\n\n${insightContext}`
    : `Question: ${question}\n\nNo relevant insights were found in the database for this question.`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// CSV column mapping
// ---------------------------------------------------------------------------
export function csvMappingPrompt(
  headers: string[],
  sampleRows: Record<string, string>[]
): { system: string; user: string } {
  const system = `You are a data mapping assistant. Given CSV column headers and sample data rows, determine the best mapping from CSV columns to insight fields.

Available insight fields:
- "title": Short summary of the insight (required)
- "description": Full text of the insight (required)
- "source": Origin of the insight (optional)
- "metadata": Any other column that doesn't map to the above fields

RULES:
- Every CSV column must be mapped to exactly one insight field or "metadata".
- Exactly one column should map to "title".
- Exactly one column should map to "description".
- At most one column should map to "source".
- All other columns should map to "metadata".
- Use the column names AND sample data to make smart decisions.

Respond ONLY with valid JSON matching this schema:
{
  "mapping": {
    "csv_column_name": "title" | "description" | "source" | "metadata"
  }
}`;

  const sampleData = sampleRows
    .slice(0, 3)
    .map((row, i) => `Row ${i + 1}: ${JSON.stringify(row)}`)
    .join("\n");

  const user = `Map these CSV columns to insight fields:

Headers: ${JSON.stringify(headers)}

Sample data:
${sampleData}`;

  return { system, user };
}
