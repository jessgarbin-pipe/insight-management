import { createServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { renderHighPriorityAlert } from "@/lib/email/templates/high-priority-alert";

/**
 * Send high-priority alert emails for insights with priority_score > 80.
 * Fire-and-forget: does not throw on failure.
 */
export function notifyHighPriorityInsight(insight: {
  id: string;
  title: string;
  description: string;
  priority_score: number;
  user_id?: string | null;
}) {
  // Don't block the caller - run in background
  _sendAlerts(insight).catch((err) =>
    console.error(`[HighPriorityAlert] Failed for insight ${insight.id}:`, err)
  );
}

async function _sendAlerts(insight: {
  id: string;
  title: string;
  description: string;
  priority_score: number;
  user_id?: string | null;
}) {
  if (insight.priority_score <= 80) return;

  const supabase = createServerClient();
  const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : "https://app.example.com";

  // Find users who have high_priority_alerts enabled
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .eq("high_priority_alerts", true);

  if (!prefs || prefs.length === 0) return;

  for (const pref of prefs) {
    try {
      const {
        data: { user },
      } = await supabase.auth.admin.getUserById(pref.user_id);

      if (!user?.email) continue;

      const { subject, html } = renderHighPriorityAlert({
        insightTitle: insight.title,
        insightDescription: insight.description,
        priorityScore: insight.priority_score,
        suggestedAction:
          insight.priority_score > 90
            ? "This insight requires immediate attention. Consider escalating to the product team."
            : "Review this insight and determine if action is needed.",
        insightId: insight.id,
        appUrl,
      });

      sendEmail({ to: user.email, subject, html });
    } catch (err) {
      console.error(
        `[HighPriorityAlert] Failed to notify user ${pref.user_id}:`,
        err
      );
    }
  }
}
