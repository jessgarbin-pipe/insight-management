interface ThemeRef {
  id: string;
  name: string;
  description: string | null;
}

export interface ClassificationResult {
  themes: Array<{
    themeId: string;
    confidence: number;
    isPrimary: boolean;
  }>;
  suggestedNewTheme?: {
    name: string;
    description: string;
    reasoning: string;
  };
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  sentimentScore: number;
  importance: "critical" | "high" | "medium" | "low";
  summary: string;
}

export async function classifyInsight(
  content: string,
  existingThemes: ThemeRef[],
  apiKey: string
): Promise<ClassificationResult> {
  const themesDescription = existingThemes
    .map((t) => `- ID: "${t.id}" | Name: "${t.name}" | Description: "${t.description || "N/A"}"`)
    .join("\n");

  const systemPrompt = `You are an insight classification engine for a product team.
Your job is to analyze customer/user feedback and classify it accurately.

AVAILABLE THEMES:
${themesDescription}

RULES:
1. Assign 1-3 themes from the list above. Mark exactly one as primary (the best fit).
2. Use the exact theme ID from the list above in your response.
3. If NO existing theme fits well (confidence < 50 for all), suggest ONE new theme in suggestedNewTheme.
4. Rate sentiment: "positive", "negative", "neutral", or "mixed". Score from -100 (very negative) to +100 (very positive).
5. Rate importance: "critical" = outage/data loss/churn risk, "high" = significant pain point, "medium" = standard feedback, "low" = nice-to-have/cosmetic.
6. Provide a one-line summary in Portuguese (max 120 chars).

Respond ONLY with valid JSON matching this exact schema:
{
  "themes": [{ "themeId": "string", "confidence": number, "isPrimary": boolean }],
  "suggestedNewTheme": { "name": "string", "description": "string", "reasoning": "string" } | null,
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "sentimentScore": number,
  "importance": "critical" | "high" | "medium" | "low",
  "summary": "string"
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Classify this insight:\n\n"${content}"`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
    usage?: { input_tokens: number; output_tokens: number };
  };

  const textBlock = data.content.find((c) => c.type === "text");
  if (!textBlock) {
    throw new Error("No text response from Claude API");
  }

  // Extract JSON from response (handle potential markdown wrapping)
  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const result = JSON.parse(jsonStr) as ClassificationResult;

  // Attach token usage for logging
  (result as ClassificationResult & { _tokensUsed?: number })._tokensUsed =
    data.usage
      ? data.usage.input_tokens + data.usage.output_tokens
      : undefined;

  return result;
}

export function normalizeContent(content: string): string {
  return content
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
