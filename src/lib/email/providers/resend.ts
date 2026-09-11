import { Resend } from "resend";
import type { EmailProvider, EmailPayload, EmailProviderType } from "../types";
import { trackEmailAndCheck } from "../usage-tracker";

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!resendInstance && process.env.RESEND_API_KEY) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

function getSenderEmail(): string {
  return process.env.FROM_EMAIL || "IT Tickets <noreply@it-tickets.dev>";
}

async function checkUsageAlert(stats: { count: number; limit: number; shouldAlert: boolean }): Promise<void> {
  const percentage = (stats.count / stats.limit) * 100;

  if (stats.shouldAlert) {
    if (stats.count >= stats.limit) {
      console.error(
        `[Resend] ALERT: ${stats.count}/${stats.limit} emails sent today (${percentage.toFixed(1)}% of Resend daily limit). ` +
          `SWITCH PROVIDER NOW! Set EMAIL_PROVIDER=brevo in .env`
      );
    } else {
      console.warn(
        `[Resend] ALERT: ${stats.count}/${stats.limit} emails sent today (${percentage.toFixed(1)}% of Resend daily limit). ` +
          `Consider switching to brevo if approaching limit.`
      );
    }
  }
}

export const resendProvider: EmailProvider = {
  name: "resend" as EmailProviderType,

  async sendEmail(payload: EmailPayload): Promise<void> {
    const startTime = Date.now();

    if (process.env.NODE_ENV === "development" && !process.env.FORCE_EMAIL_SEND) {
      console.log(`[Resend] Skipped (development mode): ${payload.subject} → ${payload.to.join(", ")}`);
      return;
    }

    if (process.env.SKIP_EMAIL === "true") {
      console.log(`[Resend] Skipped (SKIP_EMAIL=true): ${payload.subject} → ${payload.to.join(", ")}`);
      return;
    }

    if (!process.env.RESEND_API_KEY) {
      console.error(`[Resend] ERROR: RESEND_API_KEY not configured`);
      return;
    }

    const resend = getResend();
    if (!resend) {
      console.error(`[Resend] ERROR: Failed to initialize Resend client`);
      return;
    }

    const senderEmail = getSenderEmail();

    console.log(`[Resend] Sending email: "${payload.subject}"`);
    console.log(`[Resend] From: ${senderEmail}`);
    console.log(`[Resend] To: ${payload.to.join(", ")}`);

    try {
      const result = await resend.emails.send({
        from: senderEmail,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        headers: payload.headers,
      });

      const duration = Date.now() - startTime;

      if (result.error) {
        console.error(`[Resend] ERROR: Failed to send email after ${duration}ms`);
        console.error(`[Resend] Subject: ${payload.subject}`);
        console.error(`[Resend] Recipients: ${payload.to.join(", ")}`);
        console.error(`[Resend] Error:`, JSON.stringify(result.error, null, 2));

        const stats = await getResendUsageStats();
        console.error(`[Resend] Usage today: ${stats.count}/${stats.limit}`);
      } else {
        console.log(`[Resend] SUCCESS: Email sent in ${duration}ms`);
        console.log(`[Resend] Email ID: ${result.data?.id}`);

        const stats = await trackEmailAndCheck();
        await checkUsageAlert(stats);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Resend] ERROR: Exception thrown after ${duration}ms`);
      console.error(`[Resend] Subject: ${payload.subject}`);
      console.error(`[Resend] Recipients: ${payload.to.join(", ")}`);

      if (error instanceof Error) {
        console.error(`[Resend] Error: ${error.message}`);
        console.error(`[Resend] Stack: ${error.stack}`);
      }
    }
  },
};

async function getResendUsageStats() {
  const { getUsageStats } = await import("../usage-tracker");
  return getUsageStats();
}
