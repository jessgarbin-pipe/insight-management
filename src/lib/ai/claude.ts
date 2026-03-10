import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_RETRIES = 3;

export async function callClaude<T>(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; retries?: number; parseJson?: boolean }
): Promise<T> {
  const maxRetries = options?.retries ?? DEFAULT_RETRIES;
  const parseJson = options?.parseJson ?? true;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const text = textBlock ? textBlock.text : "";

      if (!parseJson) {
        return text as T;
      }

      // Extract JSON from the response - handle markdown code blocks
      let jsonStr = text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      return JSON.parse(jsonStr) as T;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const status = (error as { status?: number })?.status;
      if (status === 429 || (status && status >= 500)) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(
          `[Claude] Retryable error (status ${status}), attempt ${attempt + 1}/${maxRetries}, waiting ${delay}ms`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
