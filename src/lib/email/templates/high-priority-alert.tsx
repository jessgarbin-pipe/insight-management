interface HighPriorityAlertProps {
  insightTitle: string;
  insightDescription: string;
  priorityScore: number;
  suggestedAction: string;
  insightId: string;
  appUrl: string;
}

export function renderHighPriorityAlert({
  insightTitle,
  insightDescription,
  priorityScore,
  suggestedAction,
  insightId,
  appUrl,
}: HighPriorityAlertProps): { subject: string; html: string } {
  const truncatedDesc =
    insightDescription.length > 300
      ? insightDescription.slice(0, 300) + "..."
      : insightDescription;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background-color: #dc2626; padding: 24px 32px;">
            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">High-Priority Insight Alert</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding: 24px 32px;">
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Priority Score: ${priorityScore}/100</p>
              <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b;">${insightTitle}</h2>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">${truncatedDesc}</p>

            ${
              suggestedAction
                ? `<div style="background-color: #f0fdf4; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Suggested Action</p>
              <p style="margin: 0; font-size: 14px; color: #333;">${suggestedAction}</p>
            </div>`
                : ""
            }

            <a href="${appUrl}/explorer/insights/${insightId}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500;">View Insight</a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding: 16px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">You're receiving this because you have high-priority alerts enabled. <a href="${appUrl}/settings" style="color: #64748b;">Manage preferences</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject: `[Urgent] High-Priority Insight: ${insightTitle}`,
    html,
  };
}
