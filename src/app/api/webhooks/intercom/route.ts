import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { processInsight } from "@/lib/pipeline/layer1";
import { verifyHmacSha256, webhookError, webhookOk } from "@/lib/utils/webhooks";

const INTERCOM_WEBHOOK_SECRET = process.env.INTERCOM_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    if (!INTERCOM_WEBHOOK_SECRET) {
      console.error("[Intercom Webhook] INTERCOM_WEBHOOK_SECRET is not set");
      return webhookError("Webhook not configured", 500);
    }

    const rawBody = await request.text();

    // Validate HMAC-SHA256 signature
    const signature = request.headers.get("x-hub-signature");
    if (!signature) {
      return webhookError("Missing signature header");
    }

    // Intercom sends signature as "sha256=<hex>"
    const signatureHash = signature.replace("sha256=", "");
    if (!verifyHmacSha256(rawBody, signatureHash, INTERCOM_WEBHOOK_SECRET)) {
      return webhookError("Invalid signature", 401);
    }

    const payload = JSON.parse(rawBody);
    const topic = payload.topic as string;

    // Only handle conversation events
    const supportedTopics = [
      "conversation.user.created",
      "conversation.user.replied",
    ];
    if (!supportedTopics.includes(topic)) {
      return webhookOk({ skipped: true, reason: `Unhandled topic: ${topic}` });
    }

    const conversationData = payload.data?.item;
    if (!conversationData) {
      return webhookError("Missing conversation data in payload");
    }

    // Extract fields from Intercom conversation
    const conversationId = conversationData.id;
    const source = conversationData.source || conversationData.conversation_message;
    const body = source?.body || conversationData.body || "";
    const author = source?.author || {};
    const customerName = author.name || "Unknown";
    const customerEmail = author.email || "";

    // Strip HTML tags from body for plain text
    const plainBody = body.replace(/<[^>]*>/g, "").trim();

    if (!plainBody) {
      return webhookOk({ skipped: true, reason: "Empty conversation body" });
    }

    const title = `Intercom ${topic === "conversation.user.created" ? "conversation" : "reply"} from ${customerName}`;
    const description = plainBody.length > 2000
      ? plainBody.substring(0, 2000) + "..."
      : plainBody;

    // Create insight
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("insights")
      .insert({
        title,
        description,
        source: "intercom",
        metadata: {
          conversation_id: conversationId,
          customer_name: customerName,
          customer_email: customerEmail,
          event_type: topic,
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Intercom Webhook] Failed to create insight:", error);
      return webhookError("Failed to create insight", 500);
    }

    // Fire-and-forget Layer 1 processing
    processInsight(data.id).catch((err) => {
      console.error("[Intercom Webhook] Layer 1 failed for insight:", data.id, err);
    });

    return webhookOk({ insight_id: data.id });
  } catch (error) {
    console.error("[Intercom Webhook] Error:", error);
    return webhookError("Internal server error", 500);
  }
}
