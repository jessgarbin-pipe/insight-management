import { NextRequest, NextResponse } from "next/server";
import { validateRequired } from "@/lib/utils/validation";
import { askQuestion } from "@/lib/pipeline/layer3";

// POST /api/ask - Ask a question about the insight repository
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { valid, errors } = validateRequired(body, ["question"]);
    if (!valid) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    if (typeof body.question !== "string" || body.question.trim() === "") {
      return NextResponse.json(
        { error: "question must be a non-empty string" },
        { status: 422 }
      );
    }

    // Delegate to Layer 3 (placeholder in Phase 3, real in Phase 4)
    const result = await askQuestion(body.question.trim());

    return NextResponse.json(result);
  } catch (error) {
    console.error("Ask POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
