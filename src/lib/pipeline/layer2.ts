import { createServerClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/ai/claude";
import { layer2OpportunitiesPrompt } from "@/lib/ai/prompts";

interface OpportunityResult {
  opportunities: {
    title: string;
    description: string;
    estimated_impact: "high" | "medium" | "low";
    theme_name: string;
    supporting_insight_titles: string[];
  }[];
}

export async function runLayer2(): Promise<{
  opportunities_created: number;
  opportunities_updated: number;
  trends_updated: number;
  scores_recalculated: number;
}> {
  const supabase = createServerClient();
  let opportunitiesCreated = 0;
  let opportunitiesUpdated = 0;
  let trendsUpdated = 0;
  let scoresRecalculated = 0;

  // -----------------------------------------------------------------------
  // 1. Opportunity Identification
  // -----------------------------------------------------------------------
  try {
    // Fetch themes with 3+ insights
    const { data: qualifyingThemes } = await supabase
      .from("themes")
      .select("id, name, description, insight_count")
      .gte("insight_count", 3)
      .order("insight_count", { ascending: false });

    if (qualifyingThemes && qualifyingThemes.length > 0) {
      // For each theme, fetch linked insight summaries
      const themesWithInsights = await Promise.all(
        qualifyingThemes.map(async (theme) => {
          const { data: insightLinks } = await supabase
            .from("insight_themes")
            .select("insight_id")
            .eq("theme_id", theme.id);

          const insightIds = (insightLinks || []).map((l) => l.insight_id);

          let insights: { title: string; description: string }[] = [];
          if (insightIds.length > 0) {
            const { data: insightData } = await supabase
              .from("insights")
              .select("title, description")
              .in("id", insightIds)
              .limit(10);
            insights = insightData || [];
          }

          return { ...theme, insights };
        })
      );

      // Call Claude for opportunity identification
      const prompt = layer2OpportunitiesPrompt(themesWithInsights);
      const result = await callClaude<OpportunityResult>(
        prompt.system,
        prompt.user,
        { maxTokens: 2048 }
      );

      // Upsert opportunities
      for (const opp of result.opportunities || []) {
        // Find the theme this opportunity belongs to
        const matchingTheme = qualifyingThemes.find(
          (t) => t.name.toLowerCase() === opp.theme_name.toLowerCase()
        );
        const themeId = matchingTheme?.id || null;

        // Check if an opportunity with similar title already exists for this theme
        const { data: existingOpp } = await supabase
          .from("opportunities")
          .select("id, title")
          .eq("theme_id", themeId)
          .ilike("title", opp.title)
          .maybeSingle();

        if (existingOpp) {
          // Update existing opportunity
          await supabase
            .from("opportunities")
            .update({
              description: opp.description,
              estimated_impact: opp.estimated_impact,
            })
            .eq("id", existingOpp.id);
          opportunitiesUpdated++;

          // Link supporting insights
          await linkInsightsToOpportunity(
            supabase,
            existingOpp.id,
            opp.supporting_insight_titles
          );
        } else {
          // Create new opportunity
          const { data: newOpp } = await supabase
            .from("opportunities")
            .insert({
              title: opp.title,
              description: opp.description,
              estimated_impact: opp.estimated_impact,
              theme_id: themeId,
            })
            .select("id")
            .single();

          if (newOpp) {
            opportunitiesCreated++;
            await linkInsightsToOpportunity(
              supabase,
              newOpp.id,
              opp.supporting_insight_titles
            );
          }
        }
      }
    }
  } catch (err) {
    console.error("[Layer 2] Opportunity identification failed:", err);
  }

  // -----------------------------------------------------------------------
  // 2. Trend Detection
  // -----------------------------------------------------------------------
  try {
    const { data: allThemes } = await supabase
      .from("themes")
      .select("id, name")
      .gt("insight_count", 0);

    if (allThemes) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      for (const theme of allThemes) {
        // Count insights in the last 7 days
        const { data: recentLinks } = await supabase
          .from("insight_themes")
          .select("insight_id, insights!inner(created_at)")
          .eq("theme_id", theme.id)
          .gte("insights.created_at", sevenDaysAgo.toISOString());
        const recentCount = recentLinks?.length || 0;

        // Count insights in the prior 7 days (7-14 days ago)
        const { data: priorLinks } = await supabase
          .from("insight_themes")
          .select("insight_id, insights!inner(created_at)")
          .eq("theme_id", theme.id)
          .gte("insights.created_at", fourteenDaysAgo.toISOString())
          .lt("insights.created_at", sevenDaysAgo.toISOString());
        const priorCount = priorLinks?.length || 0;

        // Calculate trend
        let trend: "growing" | "stable" | "declining" = "stable";
        if (priorCount > 0) {
          const changeRatio = (recentCount - priorCount) / priorCount;
          if (changeRatio > 0.2) {
            trend = "growing";
          } else if (changeRatio < -0.2) {
            trend = "declining";
          }
        } else if (recentCount > 0) {
          trend = "growing";
        }

        await supabase
          .from("themes")
          .update({ trend })
          .eq("id", theme.id);

        trendsUpdated++;
      }
    }
  } catch (err) {
    console.error("[Layer 2] Trend detection failed:", err);
  }

  // -----------------------------------------------------------------------
  // 3. Score Recalculation
  // -----------------------------------------------------------------------
  try {
    // Fetch recent manager actions (last 30 days)
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: recentActions } = await supabase
      .from("manager_actions")
      .select("action_type, theme_id, insight_id, details")
      .gte("created_at", thirtyDaysAgo);

    // Build theme preference map from manager actions
    const themeDismissCount: Record<string, number> = {};
    const themeAcceptCount: Record<string, number> = {};
    const themePreferences: Record<string, number> = {};
    // Track insight types that get archived frequently
    const typeArchiveCount: Record<string, number> = {};
    const typeTotalCount: Record<string, number> = {};

    for (const action of recentActions || []) {
      if (action.theme_id) {
        if (action.action_type === "dismiss") {
          themeDismissCount[action.theme_id] =
            (themeDismissCount[action.theme_id] || 0) + 1;
          themePreferences[action.theme_id] =
            (themePreferences[action.theme_id] || 0) - 1;
        } else if (action.action_type === "accept") {
          themeAcceptCount[action.theme_id] =
            (themeAcceptCount[action.theme_id] || 0) + 1;
          themePreferences[action.theme_id] =
            (themePreferences[action.theme_id] || 0) + 1;
        }
      }

      // Track status_change actions where insights are archived, by type
      if (
        action.action_type === "status_change" &&
        action.insight_id &&
        (action.details as Record<string, unknown>)?.to_status === "archived"
      ) {
        // Look up the insight type (we'll batch this below)
        const { data: archivedInsight } = await supabase
          .from("insights")
          .select("type")
          .eq("id", action.insight_id)
          .maybeSingle();

        if (archivedInsight?.type) {
          typeArchiveCount[archivedInsight.type] =
            (typeArchiveCount[archivedInsight.type] || 0) + 1;
        }
      }
    }

    // Count total insights by type (for ratio calculation)
    for (const t of ["bug", "feature_request", "praise", "question"]) {
      const { count } = await supabase
        .from("insights")
        .select("id", { count: "exact", head: true })
        .eq("type", t);
      typeTotalCount[t] = count || 0;
    }

    // Calculate type archive rates (0-1)
    const typeArchiveRate: Record<string, number> = {};
    for (const [type, archived] of Object.entries(typeArchiveCount)) {
      const total = typeTotalCount[type] || 1;
      typeArchiveRate[type] = archived / total;
    }

    // Recalculate scores for all open insights
    const { data: openInsights } = await supabase
      .from("insights")
      .select("id, priority_score, created_at, metadata, type")
      .eq("status", "open")
      .not("priority_score", "is", null);

    if (openInsights) {
      for (const insight of openInsights) {
        // Skip manually scored insights
        const metadata = insight.metadata as Record<string, unknown>;
        if (metadata?.manually_scored) continue;

        const baseScore = insight.priority_score as number;

        // Recency boost: newer insights get up to +10 points
        const ageInDays =
          (Date.now() - new Date(insight.created_at).getTime()) /
          (1000 * 60 * 60 * 24);
        const recencyBoost = Math.max(0, 10 - ageInDays * 0.5);

        // Theme size boost: find linked themes and boost based on their size
        const { data: themeLinks } = await supabase
          .from("insight_themes")
          .select("theme_id, themes(insight_count)")
          .eq("insight_id", insight.id);

        let themeSizeBoost = 0;
        let managerAdjustment = 0;

        if (themeLinks) {
          for (const link of themeLinks) {
            const themeData = link.themes as unknown as { insight_count: number } | null;
            const count = themeData?.insight_count || 0;
            // Larger themes = more relevance (up to +10 points)
            themeSizeBoost = Math.max(
              themeSizeBoost,
              Math.min(10, count * 1.5)
            );

            // Manager preference adjustment based on dismiss/accept rates
            const dismisses = themeDismissCount[link.theme_id] || 0;
            const accepts = themeAcceptCount[link.theme_id] || 0;
            const totalActions = dismisses + accepts;

            if (totalActions >= 2) {
              // Only adjust when there's a meaningful pattern (2+ actions)
              const dismissRate = dismisses / totalActions;
              const acceptRate = accepts / totalActions;

              if (dismissRate > 0.6) {
                // High dismiss rate: reduce priority proportionally
                managerAdjustment -= Math.round(dismissRate * 15);
              } else if (acceptRate > 0.6) {
                // High accept rate: boost priority proportionally
                managerAdjustment += Math.round(acceptRate * 10);
              }
            } else {
              // Fallback to simple preference count
              const pref = themePreferences[link.theme_id] || 0;
              managerAdjustment += pref * 3;
            }
          }
        }

        // Type-based archive penalty
        let typeArchivePenalty = 0;
        const insightType = insight.type as string | null;

        if (insightType && typeArchiveRate[insightType] > 0.3) {
          // If >30% of this insight type gets archived, apply penalty
          typeArchivePenalty = -Math.round(typeArchiveRate[insightType] * 10);
        }

        const newScore = Math.max(
          0,
          Math.min(100, Math.round(baseScore + recencyBoost + themeSizeBoost + managerAdjustment + typeArchivePenalty))
        );

        if (newScore !== baseScore) {
          await supabase
            .from("insights")
            .update({ priority_score: newScore })
            .eq("id", insight.id);
          scoresRecalculated++;
        }
      }
    }

    // Recalculate aggregated_score on themes
    const { data: allThemes } = await supabase
      .from("themes")
      .select("id")
      .gt("insight_count", 0);

    if (allThemes) {
      for (const theme of allThemes) {
        const { data: linkedInsights } = await supabase
          .from("insight_themes")
          .select("insights(priority_score)")
          .eq("theme_id", theme.id);

        if (linkedInsights && linkedInsights.length > 0) {
          const scores = linkedInsights
            .map((li) => {
              const insightData = li.insights as unknown as { priority_score: number | null } | null;
              return insightData?.priority_score;
            })
            .filter((s): s is number => s !== null && s !== undefined);

          const avgScore =
            scores.length > 0
              ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
              : null;

          await supabase
            .from("themes")
            .update({ aggregated_score: avgScore })
            .eq("id", theme.id);
        }
      }
    }
  } catch (err) {
    console.error("[Layer 2] Score recalculation failed:", err);
  }

  console.log(
    `[Layer 2] Complete: ${opportunitiesCreated} created, ${opportunitiesUpdated} updated, ${trendsUpdated} trends, ${scoresRecalculated} scores`
  );

  return {
    opportunities_created: opportunitiesCreated,
    opportunities_updated: opportunitiesUpdated,
    trends_updated: trendsUpdated,
    scores_recalculated: scoresRecalculated,
  };
}

// Helper: Link insights to an opportunity by matching titles
async function linkInsightsToOpportunity(
  supabase: ReturnType<typeof createServerClient>,
  opportunityId: string,
  insightTitles: string[]
) {
  for (const title of insightTitles) {
    const { data: insight } = await supabase
      .from("insights")
      .select("id")
      .ilike("title", title)
      .limit(1)
      .maybeSingle();

    if (insight) {
      await supabase
        .from("insight_opportunities")
        .upsert(
          { insight_id: insight.id, opportunity_id: opportunityId },
          { onConflict: "insight_id,opportunity_id" }
        );
    }
  }
}
