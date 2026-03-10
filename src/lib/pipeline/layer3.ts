import { createServerClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { callClaude } from "@/lib/ai/claude";
import { briefingPrompt, askPrompt } from "@/lib/ai/prompts";
import type { BriefingResponse, Insight } from "@/lib/types";

export async function generateBriefing(): Promise<BriefingResponse> {
  const supabase = createServerClient();

  // 1. Determine time window (last briefing or 24 hours)
  let sinceDate: string;
  const { data: cached } = await supabase
    .from("briefing_cache")
    .select("generated_at")
    .eq("id", "latest")
    .maybeSingle();

  if (cached?.generated_at) {
    sinceDate = cached.generated_at;
  } else {
    sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  }

  // 2. Gather context
  // a. New insights since last briefing
  const { data: newInsights } = await supabase
    .from("insights")
    .select("id, title, source, priority_score")
    .gte("created_at", sinceDate)
    .order("priority_score", { ascending: false, nullsFirst: false })
    .limit(20);

  // b. Themes with trend data
  const { data: trendThemes } = await supabase
    .from("themes")
    .select("name, trend, insight_count")
    .not("trend", "is", null)
    .gt("insight_count", 0);

  // c. New/updated opportunities since last briefing
  const { data: newOpportunities } = await supabase
    .from("opportunities")
    .select("title, estimated_impact, theme_id")
    .gte("updated_at", sinceDate);

  // d. Unresolved high-priority items
  const { data: highPriorityItems } = await supabase
    .from("insights")
    .select("id, title, priority_score, status")
    .eq("status", "open")
    .gt("priority_score", 70)
    .order("priority_score", { ascending: false })
    .limit(15);

  // e. Recent manager actions (for adaptiveness)
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: recentActions } = await supabase
    .from("manager_actions")
    .select("action_type, details, theme_id")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(50);

  // 3. Build prompt and call Claude
  const prompt = briefingPrompt({
    newInsights: (newInsights || []).map((i) => ({
      title: i.title,
      id: i.id,
      source: i.source,
      priority_score: i.priority_score,
    })),
    trendChanges: (trendThemes || []).map((t) => ({
      name: t.name,
      trend: t.trend!,
      insight_count: t.insight_count,
    })),
    newOpportunities: (newOpportunities || []).map((o) => ({
      title: o.title,
      estimated_impact: o.estimated_impact,
      theme_id: o.theme_id,
    })),
    highPriorityItems: (highPriorityItems || []).map((i) => ({
      id: i.id,
      title: i.title,
      priority_score: i.priority_score,
      status: i.status,
    })),
    recentActions: (recentActions || []).map((a) => ({
      action_type: a.action_type,
      details: (a.details as Record<string, unknown>) || {},
      theme_id: a.theme_id,
    })),
  });

  const hasAnyContext =
    (newInsights?.length || 0) > 0 ||
    (trendThemes?.length || 0) > 0 ||
    (newOpportunities?.length || 0) > 0 ||
    (highPriorityItems?.length || 0) > 0;

  if (!hasAnyContext) {
    return {
      summary: "No new activity since your last review. All insights are up to date.",
      generated_at: new Date().toISOString(),
      cached: false,
      items: [],
    };
  }

  try {
    const result = await callClaude<{ summary: string; items: BriefingResponse["items"] }>(
      prompt.system,
      prompt.user,
      { maxTokens: 2048 }
    );

    const briefing: BriefingResponse = {
      summary: result.summary || "Briefing generated.",
      generated_at: new Date().toISOString(),
      cached: false,
      items: (result.items || []).map((item, idx) => ({
        id: item.id || `briefing-item-${idx + 1}`,
        description: item.description,
        suggested_action: item.suggested_action,
        related_insight_ids: item.related_insight_ids || [],
        priority: item.priority || idx + 1,
      })),
    };

    // 5. Cache the result
    await supabase.from("briefing_cache").upsert({
      id: "latest",
      data: briefing,
      generated_at: briefing.generated_at,
    });

    return briefing;
  } catch (err) {
    console.error("[Layer 3] Briefing generation failed:", err);
    return {
      summary:
        "Unable to generate AI briefing at this time. Please try again later.",
      generated_at: new Date().toISOString(),
      cached: false,
      items: [],
    };
  }
}

export async function askQuestion(
  question: string
): Promise<{ answer: string; referenced_insights: Insight[] }> {
  const supabase = createServerClient();

  // 1. Generate embedding for the question
  let questionEmbedding: number[];
  try {
    questionEmbedding = await generateEmbedding(question);
  } catch (err) {
    console.error("[Layer 3] Question embedding failed:", err);
    return {
      answer:
        "Unable to process your question at this time. The embedding service may be unavailable.",
      referenced_insights: [],
    };
  }

  // 2. Query top 20 insights by cosine similarity
  // Use Supabase RPC for vector similarity search
  let relevantInsights: (Insight & { similarity: number })[] = [];

  try {
    const embeddingStr = `[${questionEmbedding.join(",")}]`;
    const { data: matches } = await supabase.rpc("match_insights", {
      query_embedding: embeddingStr,
      match_threshold: 0.7,
      match_count: 20,
      exclude_id: null,
    });

    if (matches && matches.length > 0) {
      relevantInsights = matches;
    }
  } catch {
    // RPC might not exist - fall back to fetching recent insights as context
    console.warn("[Layer 3] Vector search RPC not available, using recent insights as fallback");
    const { data: fallbackInsights } = await supabase
      .from("insights")
      .select("*")
      .not("embedding", "is", null)
      .order("priority_score", { ascending: false, nullsFirst: false })
      .limit(20);

    if (fallbackInsights) {
      relevantInsights = fallbackInsights.map((i) => ({
        ...i,
        similarity: 0.8,
      })) as (Insight & { similarity: number })[];
    }
  }

  // 3. Filter to similarity > 0.7 (already done in RPC, but just in case)
  const filtered = relevantInsights.filter((i) => i.similarity > 0.7);

  if (filtered.length === 0) {
    return {
      answer:
        "I couldn't find any relevant insights in the database that relate to your question. Try adding more insights or rephrasing your question.",
      referenced_insights: [],
    };
  }

  // 4. Call Claude with question + insight context
  const prompt = askPrompt(
    question,
    filtered.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      source: i.source,
      sentiment: i.sentiment,
    }))
  );

  try {
    const answer = await callClaude<string>(prompt.system, prompt.user, {
      maxTokens: 2048,
      parseJson: false,
    });

    // 5. Match cited insight titles to actual insight objects
    const referencedInsights = filtered.filter((insight) =>
      answer.includes(insight.title)
    );

    // Return all matching insights, stripping the similarity field and embedding
    const cleanInsights: Insight[] = (
      referencedInsights.length > 0 ? referencedInsights : filtered.slice(0, 5)
    ).map(({ similarity: _similarity, ...rest }) => ({
      ...rest,
      embedding: null, // Don't send embeddings to the client
    }));

    return {
      answer,
      referenced_insights: cleanInsights,
    };
  } catch (err) {
    console.error("[Layer 3] Ask question failed:", err);
    return {
      answer:
        "Unable to generate an answer at this time. Please try again later.",
      referenced_insights: [],
    };
  }
}
