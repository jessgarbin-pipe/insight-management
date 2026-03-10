import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { renderBriefingDigest } from "@/lib/email/templates/briefing-digest";
import { renderWeeklySummary } from "@/lib/email/templates/weekly-summary";

// POST /api/notifications/digest - Cron-triggered: generate and send digest emails
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : "https://app.example.com";

    // Determine if this is a daily or weekly run based on the day
    const today = new Date();
    const isMonday = today.getUTCDay() === 1;

    // Fetch all users with notification preferences
    const { data: allPrefs } = await supabase
      .from("notification_preferences")
      .select("user_id, digest_frequency");

    if (!allPrefs || allPrefs.length === 0) {
      return NextResponse.json({ sent: 0, message: "No users with preferences" });
    }

    // Filter users who should receive a digest today
    const recipients = allPrefs.filter((p) => {
      if (p.digest_frequency === "off") return false;
      if (p.digest_frequency === "daily") return true;
      if (p.digest_frequency === "weekly" && isMonday) return true;
      return false;
    });

    if (recipients.length === 0) {
      return NextResponse.json({ sent: 0, message: "No digests to send today" });
    }

    // Gather data for digest
    const since = new Date();
    const lookbackDays = isMonday ? 7 : 1;
    since.setDate(since.getDate() - lookbackDays);
    const sinceISO = since.toISOString();

    const [insightsResult, themesResult, opportunitiesResult, actionsResult] =
      await Promise.all([
        supabase
          .from("insights")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sinceISO),
        supabase
          .from("themes")
          .select("name, insight_count")
          .order("insight_count", { ascending: false })
          .limit(5),
        supabase
          .from("opportunities")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sinceISO),
        supabase
          .from("manager_actions")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sinceISO),
      ]);

    const newInsightsCount = insightsResult.count || 0;
    const trendingThemes = (themesResult.data || []).map((t) => ({
      name: t.name,
      count: t.insight_count,
    }));
    const opportunitiesCreated = opportunitiesResult.count || 0;
    const actionsTaken = actionsResult.count || 0;

    // Get top action items from recent high-priority insights
    const { data: highPriority } = await supabase
      .from("insights")
      .select("title, priority_score")
      .gte("created_at", sinceISO)
      .not("priority_score", "is", null)
      .order("priority_score", { ascending: false })
      .limit(5);

    const topActionItems = (highPriority || []).map((i) => ({
      description: i.title,
      priority: i.priority_score as number,
    }));

    // Get user emails from auth (service role can access auth.users)
    let sentCount = 0;

    for (const recipient of recipients) {
      try {
        const {
          data: { user },
        } = await supabase.auth.admin.getUserById(recipient.user_id);

        if (!user?.email) continue;

        const frequency = recipient.digest_frequency as "daily" | "weekly";

        // Send weekly summary on Mondays for weekly subscribers
        if (frequency === "weekly" && isMonday) {
          const { subject, html } = renderWeeklySummary({
            insightsReceived: newInsightsCount,
            themesIdentified: trendingThemes.length,
            opportunitiesCreated,
            actionsTaken,
            topThemes: trendingThemes,
            appUrl,
          });
          sendEmail({ to: user.email, subject, html }); // fire-and-forget
          sentCount++;
        } else if (frequency === "daily") {
          const { subject, html } = renderBriefingDigest({
            frequency: "daily",
            newInsightsCount,
            trendingThemes,
            topActionItems,
            appUrl,
          });
          sendEmail({ to: user.email, subject, html }); // fire-and-forget
          sentCount++;
        }
      } catch (err) {
        console.error(
          `[Digest] Failed to send to user ${recipient.user_id}:`,
          err
        );
      }
    }

    return NextResponse.json({
      sent: sentCount,
      message: `Sent ${sentCount} digest emails`,
    });
  } catch (error) {
    console.error("Digest POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
