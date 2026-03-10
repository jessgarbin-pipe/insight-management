import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromEmail =
  process.env.RESEND_FROM_EMAIL || "Insight Management <noreply@example.com>";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!resend) {
    console.log(
      `[Email] Skipping send (RESEND_API_KEY not configured): "${subject}" to ${Array.isArray(to) ? to.join(", ") : to}`
    );
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error(`[Email] Send failed:`, error);
    }
  } catch (err) {
    console.error(`[Email] Unexpected error:`, err);
  }
}
