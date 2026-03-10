import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createServerClient } from "@/lib/supabase/server";
import { processInsight } from "@/lib/pipeline/layer1";
import { isTimestampValid, webhookError, webhookOk } from "@/lib/utils/webhooks";

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

function verifySlackSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secret: string
): boolean {
  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const expected = "v0=" + createHmac("sha256", secret)
    .update(sigBasestring)
    .digest("hex");

  if (expected.length !== signature.length) return false;

  // Constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Handle url_verification challenge (no signature check required per Slack docs)
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return webhookError("Invalid JSON payload");
    }

    if (payload.type === "url_verification") {
      return NextResponse.json({ challenge: payload.challenge });
    }

    // Validate signing secret is configured
    if (!SLACK_SIGNING_SECRET) {
      console.error("[Slack Webhook] SLACK_SIGNING_SECRET is not set");
      return webhookError("Webhook not configured", 500);
    }

    // Validate Slack request signature
    const timestamp = request.headers.get("x-slack-request-timestamp") || "";
    const slackSignature = request.headers.get("x-slack-signature") || "";

    if (!timestamp || !slackSignature) {
      return webhookError("Missing Slack signature headers");
    }

    // Reject requests older than 5 minutes
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || !isTimestampValid(ts)) {
      return webhookError("Request timestamp too old", 401);
    }

    if (!verifySlackSignature(rawBody, timestamp, slackSignature, SLACK_SIGNING_SECRET)) {
      return webhookError("Invalid signature", 401);
    }

    // Handle event callbacks
    if (payload.type !== "event_callback") {
      return webhookOk({ skipped: true, reason: `Unhandled type: ${payload.type}` });
    }

    const event = payload.event as Record<string, unknown> | undefined;
    if (!event || event.type !== "message") {
      return webhookOk({ skipped: true, reason: "Not a message event" });
    }

    // Filter out bot messages
    if (event.bot_id || event.subtype === "bot_message") {
      return webhookOk({ skipped: true, reason: "Bot message ignored" });
    }

    // Filter out thread replies (only top-level messages)
    if (event.thread_ts && event.thread_ts !== event.ts) {
      return webhookOk({ skipped: true, reason: "Thread reply ignored" });
    }

    // Filter out message subtypes (edits, deletes, joins, etc.)
    if (event.subtype) {
      return webhookOk({ skipped: true, reason: `Subtype ${event.subtype} ignored` });
    }

    const messageText = (event.text as string) || "";
    if (!messageText.trim()) {
      return webhookOk({ skipped: true, reason: "Empty message" });
    }

    const userName = (event.user as string) || "unknown";
    const channel = (event.channel as string) || "unknown";
    const messageTs = (event.ts as string) || "";

    const title = `Slack message from ${userName} in #${channel}`;
    const description = messageText.length > 2000
      ? messageText.substring(0, 2000) + "..."
      : messageText;

    // Create insight (org_id can be passed via query param or x-org-id header)
    const orgId = request.nextUrl.searchParams.get("org_id") || request.headers.get("x-org-id") || null;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("insights")
      .insert({
        title,
        description,
        source: "slack",
        metadata: {
          channel,
          user: userName,
          message_ts: messageTs,
          team_id: payload.team_id || null,
        },
        ...(orgId ? { org_id: orgId } : {}),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Slack Webhook] Failed to create insight:", error);
      return webhookError("Failed to create insight", 500);
    }

    // Fire-and-forget Layer 1 processing
    processInsight(data.id).catch((err) => {
      console.error("[Slack Webhook] Layer 1 failed for insight:", data.id, err);
    });

    return webhookOk({ insight_id: data.id });
  } catch (error) {
    console.error("[Slack Webhook] Error:", error);
    return webhookError("Internal server error", 500);
  }
}
