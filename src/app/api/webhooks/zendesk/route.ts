import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { processInsight } from "@/lib/pipeline/layer1";
import { webhookError, webhookOk } from "@/lib/utils/webhooks";

const ZENDESK_WEBHOOK_SECRET = process.env.ZENDESK_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    if (!ZENDESK_WEBHOOK_SECRET) {
      console.error("[Zendesk Webhook] ZENDESK_WEBHOOK_SECRET is not set");
      return webhookError("Webhook not configured", 500);
    }

    // Zendesk sends the shared secret via Authorization header or custom header
    const authHeader = request.headers.get("authorization") || "";
    const customSecret = request.headers.get("x-zendesk-webhook-secret") || "";
    const providedSecret = authHeader.replace("Bearer ", "") || customSecret;

    if (providedSecret !== ZENDESK_WEBHOOK_SECRET) {
      return webhookError("Invalid authorization", 401);
    }

    const payload = await request.json();
    const eventType = payload.event_type || payload.type;

    // Only handle ticket events
    const supportedEvents = ["ticket.created", "ticket.updated"];
    if (!supportedEvents.includes(eventType)) {
      return webhookOk({ skipped: true, reason: `Unhandled event: ${eventType}` });
    }

    const ticket = payload.ticket || payload.data?.ticket || payload;
    if (!ticket) {
      return webhookError("Missing ticket data in payload");
    }

    const ticketId = ticket.id;
    const subject = ticket.subject || ticket.title || "";
    const description = ticket.description || ticket.comment?.body || "";
    const requester = ticket.requester || {};
    const requesterName = requester.name || "";
    const requesterEmail = requester.email || "";
    const tags = ticket.tags || [];
    const priority = ticket.priority || null;

    if (!subject && !description) {
      return webhookOk({ skipped: true, reason: "Empty ticket subject and description" });
    }

    const title = subject || `Zendesk ticket #${ticketId}`;
    const insightDescription = description.length > 2000
      ? description.substring(0, 2000) + "..."
      : description || subject;

    // Create insight
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("insights")
      .insert({
        title,
        description: insightDescription,
        source: "zendesk",
        metadata: {
          ticket_id: ticketId,
          requester_name: requesterName,
          requester_email: requesterEmail,
          tags,
          priority,
          event_type: eventType,
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Zendesk Webhook] Failed to create insight:", error);
      return webhookError("Failed to create insight", 500);
    }

    // Fire-and-forget Layer 1 processing
    processInsight(data.id).catch((err) => {
      console.error("[Zendesk Webhook] Layer 1 failed for insight:", data.id, err);
    });

    return webhookOk({ insight_id: data.id });
  } catch (error) {
    console.error("[Zendesk Webhook] Error:", error);
    return webhookError("Internal server error", 500);
  }
}
