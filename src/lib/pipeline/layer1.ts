import { createServerClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { callClaude } from "@/lib/ai/claude";
import { layer1ProcessingPrompt } from "@/lib/ai/prompts";

interface Layer1Response {
  themes: { name: string; is_new: boolean; description?: string }[];
  sentiment: "positive" | "negative" | "neutral";
  urgency: "high" | "medium" | "low";
  type: "bug" | "feature_request" | "praise" | "question";
  priority_score: number;
  priority_reasoning: string;
}

export async function processInsight(insightId: string): Promise<void> {
  const supabase = createServerClient();

  // 1. Fetch the insight
  const { data: insight, error: fetchError } = await supabase
    .from("insights")
    .select("*")
    .eq("id", insightId)
    .single();

  if (fetchError || !insight) {
    console.error(`[Layer 1] Insight ${insightId} not found:`, fetchError);
    return;
  }

  // 2. Generate embedding and store it
  let embedding: number[] | null = null;
  try {
    const text = `${insight.title}\n\n${insight.description}`;
    embedding = await generateEmbedding(text);

    const { error: embError } = await supabase
      .from("insights")
      .update({ embedding: JSON.stringify(embedding) })
      .eq("id", insightId);

    if (embError) {
      console.error(`[Layer 1] Failed to store embedding for ${insightId}:`, embError);
    }
  } catch (err) {
    console.error(`[Layer 1] Embedding generation failed for ${insightId}:`, err);
    // Continue without embedding - other AI steps can still run
  }

  // 3. Duplicate detection
  if (embedding) {
    try {
      const embeddingStr = `[${embedding.join(",")}]`;
      const { data: similar } = await supabase.rpc("match_insights", {
        query_embedding: embeddingStr,
        match_threshold: 0.92,
        match_count: 5,
        exclude_id: insightId,
      });

      const similarArray = Array.isArray(similar) ? similar : [];
      if (similarArray.length > 0) {
        const duplicateIds = similarArray.map((s: { id: string }) => s.id);
        const metadata = {
          ...(insight.metadata as Record<string, unknown>),
          duplicate_of: duplicateIds[0],
          similar_insights: duplicateIds,
        };

        await supabase
          .from("insights")
          .update({ metadata })
          .eq("id", insightId);

        console.log(
          `[Layer 1] Duplicate detected for ${insightId}: ${duplicateIds.join(", ")}`
        );
      }
    } catch {
      // RPC may not exist yet - try direct query approach
      try {
        const { data: similarDirect } = await supabase
          .from("insights")
          .select("id")
          .neq("id", insightId)
          .not("embedding", "is", null)
          .limit(100);

        // Can't do cosine similarity directly via supabase-js without RPC
        // This is a best-effort fallback - duplicate detection will work once RPC is set up
        if (similarDirect) {
          console.log(`[Layer 1] Duplicate detection: RPC not available, skipping for ${insightId}`);
        }
      } catch (err) {
        console.error(`[Layer 1] Duplicate detection failed for ${insightId}:`, err);
      }
    }
  }

  // 4. Fetch existing themes for classification
  // 5. Call Claude for combined classification + enrichment + scoring
  // 6. Handle themes and update insight
  try {
    const { data: existingThemes } = await supabase
      .from("themes")
      .select("name, description")
      .gt("insight_count", 0)
      .order("insight_count", { ascending: false })
      .limit(50);

    const prompt = layer1ProcessingPrompt(
      {
        title: insight.title,
        description: insight.description,
        metadata: (insight.metadata as Record<string, unknown>) || {},
      },
      existingThemes || []
    );

    const result = await callClaude<Layer1Response>(prompt.system, prompt.user, {
      maxTokens: 1024,
    });

    // Validate and clamp priority score
    const priorityScore = Math.max(0, Math.min(100, Math.round(result.priority_score)));

    // Validate enum values
    const validSentiments = ["positive", "negative", "neutral"] as const;
    const validUrgencies = ["high", "medium", "low"] as const;
    const validTypes = ["bug", "feature_request", "praise", "question"] as const;

    const sentiment = validSentiments.includes(result.sentiment) ? result.sentiment : null;
    const urgency = validUrgencies.includes(result.urgency) ? result.urgency : null;
    const insightType = validTypes.includes(result.type) ? result.type : null;

    // 7. Update insight with AI fields
    const { error: updateError } = await supabase
      .from("insights")
      .update({
        priority_score: priorityScore,
        sentiment,
        urgency,
        type: insightType,
      })
      .eq("id", insightId);

    if (updateError) {
      console.error(`[Layer 1] Failed to update insight ${insightId}:`, updateError);
    }

    // 8. Handle themes (limit to 3)
    const themesToProcess = (result.themes || []).slice(0, 3);

    for (const themeResult of themesToProcess) {
      try {
        let themeId: string;

        // Case-insensitive search for existing theme
        const { data: existingTheme } = await supabase
          .from("themes")
          .select("id, name")
          .ilike("name", themeResult.name)
          .limit(1)
          .maybeSingle();

        if (existingTheme) {
          themeId = existingTheme.id;
        } else if (themeResult.is_new) {
          // Create new theme
          const { data: newTheme, error: themeError } = await supabase
            .from("themes")
            .insert({
              name: themeResult.name,
              description: themeResult.description || null,
            })
            .select("id")
            .single();

          if (themeError || !newTheme) {
            console.error(`[Layer 1] Failed to create theme "${themeResult.name}":`, themeError);
            continue;
          }
          themeId = newTheme.id;
        } else {
          // Claude said it's not new but we couldn't find it - create it anyway
          const { data: newTheme, error: themeError } = await supabase
            .from("themes")
            .insert({
              name: themeResult.name,
              description: themeResult.description || null,
            })
            .select("id")
            .single();

          if (themeError || !newTheme) {
            console.error(`[Layer 1] Failed to create theme "${themeResult.name}":`, themeError);
            continue;
          }
          themeId = newTheme.id;
        }

        // Link insight to theme (ignore duplicate key errors)
        const { error: linkError } = await supabase
          .from("insight_themes")
          .insert({ insight_id: insightId, theme_id: themeId });

        if (linkError && !linkError.message.includes("duplicate")) {
          console.error(
            `[Layer 1] Failed to link insight ${insightId} to theme ${themeId}:`,
            linkError
          );
        }
      } catch (themeErr) {
        console.error(`[Layer 1] Theme processing failed for "${themeResult.name}":`, themeErr);
      }
    }

    // Reconcile insight_count for all themes this insight was linked to
    // This is safe whether or not the DB trigger fired
    const linkedThemeIds = new Set<string>();
    for (const themeResult of themesToProcess) {
      const { data: th } = await supabase
        .from("themes")
        .select("id")
        .ilike("name", themeResult.name)
        .limit(1)
        .maybeSingle();
      if (th) linkedThemeIds.add(th.id);
    }

    for (const tid of linkedThemeIds) {
      const { count } = await supabase
        .from("insight_themes")
        .select("insight_id", { count: "exact", head: true })
        .eq("theme_id", tid);

      if (count !== null) {
        await supabase
          .from("themes")
          .update({ insight_count: count })
          .eq("id", tid);
      }
    }

    console.log(
      `[Layer 1] Successfully processed insight ${insightId}: score=${priorityScore}, sentiment=${sentiment}, themes=${themesToProcess.map((t) => t.name).join(", ")}`
    );
  } catch (err) {
    // AI classification failed - leave fields as null (graceful failure)
    console.error(`[Layer 1] AI classification failed for ${insightId}:`, err);
  }
}
