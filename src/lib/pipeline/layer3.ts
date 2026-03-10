import type { BriefingResponse, Insight } from "@/lib/types";

// Layer 3: Briefing generation + Ask
// Full implementation will be provided in Phase 4 by the AI pipeline agent.

export async function generateBriefing(): Promise<BriefingResponse> {
  // Phase 4 will implement:
  // 1. Determine time window
  // 2. Gather context
  // 3. Send to Claude with briefing prompt
  // 4. Parse and validate response
  // 5. Store in briefing_cache table
  console.log("[Layer 3] generateBriefing called - placeholder, awaiting Phase 4 implementation");
  return {
    summary: "No briefing data available yet. AI pipeline is not yet configured.",
    generated_at: new Date().toISOString(),
    cached: false,
    items: [],
  };
}

export async function askQuestion(
  question: string
): Promise<{ answer: string; referenced_insights: Insight[] }> {
  // Phase 4 will implement:
  // 1. Generate embedding for question
  // 2. Query top 20 insights by cosine similarity
  // 3. Filter to similarity > 0.7
  // 4. Send question + insight texts to Claude
  // 5. Parse response
  console.log(`[Layer 3] askQuestion called with: "${question}" - placeholder, awaiting Phase 4 implementation`);
  return {
    answer: "The AI pipeline is not yet configured. Please complete Phase 4 setup to enable the Ask feature.",
    referenced_insights: [],
  };
}
