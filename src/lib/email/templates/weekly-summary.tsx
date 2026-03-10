interface WeeklySummaryProps {
  insightsReceived: number;
  themesIdentified: number;
  opportunitiesCreated: number;
  actionsTaken: number;
  topThemes: { name: string; count: number }[];
  appUrl: string;
}

export function renderWeeklySummary({
  insightsReceived,
  themesIdentified,
  opportunitiesCreated,
  actionsTaken,
  topThemes,
  appUrl,
}: WeeklySummaryProps): { subject: string; html: string } {
  const statBox = (label: string, value: number, color: string) =>
    `<td width="25%" style="padding: 12px; text-align: center;">
      <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${color};">${value}</p>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${label}</p>
    </td>`;

  const themeRows = topThemes
    .map(
      (t, i) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px; color: #64748b; width: 30px;">${i + 1}.</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px; color: #333;">${t.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px; color: #666; text-align: right;">${t.count}</td>
        </tr>`
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
            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Weekly Summary</h1>
            <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 14px;">Your week in insights</p>
          </td>
        </tr>
        <!-- Stats Grid -->
        <tr>
          <td style="padding: 24px 20px 0 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px;">
              <tr>
                ${statBox("Insights", insightsReceived, "#0369a1")}
                ${statBox("Themes", themesIdentified, "#7c3aed")}
                ${statBox("Opportunities", opportunitiesCreated, "#059669")}
                ${statBox("Actions", actionsTaken, "#d97706")}
              </tr>
            </table>
          </td>
        </tr>
        <!-- Top Themes -->
        <tr>
          <td style="padding: 24px 32px;">
            ${
              topThemes.length > 0
                ? `<h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1e293b;">Top Themes This Week</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
              ${themeRows}
            </table>`
                : `<p style="font-size: 14px; color: #64748b;">No themes identified this week.</p>`
            }

            <a href="${appUrl}/dashboard" style="display: inline-block; background-color: #0369a1; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500;">View Full Dashboard</a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding: 16px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">Sent weekly on Mondays. <a href="${appUrl}/settings" style="color: #64748b;">Manage preferences</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject: `Weekly Summary: ${insightsReceived} insights, ${themesIdentified} themes`,
    html,
  };
}
