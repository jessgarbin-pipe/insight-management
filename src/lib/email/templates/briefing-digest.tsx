interface BriefingDigestProps {
  frequency: "daily" | "weekly";
  newInsightsCount: number;
  trendingThemes: { name: string; count: number }[];
  topActionItems: { description: string; priority: number }[];
  appUrl: string;
}

export function renderBriefingDigest({
  frequency,
  newInsightsCount,
  trendingThemes,
  topActionItems,
  appUrl,
}: BriefingDigestProps): { subject: string; html: string } {
  const period = frequency === "daily" ? "Daily" : "Weekly";

  const themeRows = trendingThemes
    .map(
      (t) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px; color: #333;">${t.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px; color: #666; text-align: right;">${t.count} insights</td>
        </tr>`
    )
    .join("");

  const actionRows = topActionItems
    .map(
      (a) =>
        `<li style="margin-bottom: 8px; font-size: 14px; color: #333; line-height: 1.5;">
          <span style="display: inline-block; background: ${a.priority > 80 ? "#fee2e2" : a.priority > 50 ? "#fef3c7" : "#e0f2fe"}; color: ${a.priority > 80 ? "#991b1b" : a.priority > 50 ? "#92400e" : "#075985"}; padding: 1px 6px; border-radius: 4px; font-size: 12px; margin-right: 6px;">P${a.priority}</span>
          ${a.description}
        </li>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background-color: #1e293b; padding: 24px 32px;">
            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Your ${period} Insight Briefing</h1>
          </td>
        </tr>
        <!-- Stats -->
        <tr>
          <td style="padding: 24px 32px;">
            <div style="background-color: #f0f9ff; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 32px; font-weight: 700; color: #0369a1;">${newInsightsCount}</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">new insights this ${frequency === "daily" ? "day" : "week"}</p>
            </div>

            ${
              trendingThemes.length > 0
                ? `<h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1e293b;">Trending Themes</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
              ${themeRows}
            </table>`
                : ""
            }

            ${
              topActionItems.length > 0
                ? `<h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1e293b;">Top Action Items</h2>
            <ul style="padding-left: 16px; margin: 0 0 24px 0;">
              ${actionRows}
            </ul>`
                : ""
            }

            <a href="${appUrl}/dashboard" style="display: inline-block; background-color: #0369a1; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500;">View Dashboard</a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding: 16px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">You're receiving this because you have ${frequency} digests enabled. <a href="${appUrl}/settings" style="color: #64748b;">Manage preferences</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject: `${period} Briefing: ${newInsightsCount} new insights`,
    html,
  };
}
