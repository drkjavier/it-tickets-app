import { BrevoClient } from "@getbrevo/brevo";
import type { EmailProvider, EmailPayload, EmailProviderType } from "../types";
import { trackEmailAndCheck } from "../usage-tracker";

let brevoClient: BrevoClient | null = null;

function getBrevoClient(): BrevoClient {
  if (!brevoClient) {
    brevoClient = new BrevoClient({
      apiKey: process.env.BREVO_API_KEY || "",
    });
  }
  return brevoClient;
}

function getSenderEmail(): string {
  const fromEmail = process.env.FROM_EMAIL || "IT Tickets <no-reply@it-tickets.dev>";
  const match = fromEmail.match(/<(.+?)>/);
  return match ? match[1] : fromEmail;
}

function getSenderName(): string {
  const fromEmail = process.env.FROM_EMAIL || "IT Tickets <no-reply@it-tickets.dev>";
  const match = fromEmail.match(/(.+?)\s*</);
  return match ? match[1].trim() : "IT Tickets";
}

async function checkUsageAlert(stats: { count: number; limit: number; shouldAlert: boolean }): Promise<void> {
  const percentage = (stats.count / stats.limit) * 100;

  if (stats.shouldAlert) {
    if (stats.count >= stats.limit) {
      console.error(
        `[EMAIL ALERT] ${stats.count}/${stats.limit} emails sent today (${percentage.toFixed(1)}% of Brevo daily limit). ` +
          `SWITCH PROVIDER NOW! Set EMAIL_PROVIDER=resend in .env`
      );
    } else {
      console.warn(
        `[EMAIL ALERT] ${stats.count}/${stats.limit} emails sent today (${percentage.toFixed(1)}% of Brevo daily limit). ` +
          `Consider switching to resend if approaching limit.`
      );
    }
  }
}

export const brevoProvider: EmailProvider = {
  name: "brevo" as EmailProviderType,

  async sendEmail(payload: EmailPayload): Promise<void> {
    const startTime = Date.now();

    if (process.env.NODE_ENV === "development" && !process.env.FORCE_EMAIL_SEND) {
      console.log(`[Brevo] Skipped (development mode): ${payload.subject} → ${payload.to.join(", ")}`);
      return;
    }

    if (process.env.SKIP_EMAIL === "true") {
      console.log(`[Brevo] Skipped (SKIP_EMAIL=true): ${payload.subject} → ${payload.to.join(", ")}`);
      return;
    }

    if (!process.env.BREVO_API_KEY) {
      console.error(`[Brevo] ERROR: BREVO_API_KEY not configured`);
      return;
    }

    const client = getBrevoClient();
    const senderEmail = getSenderEmail();
    const senderName = getSenderName();

    console.log(`[Brevo] Sending email: "${payload.subject}"`);
    console.log(`[Brevo] From: ${senderName} <${senderEmail}>`);
    console.log(`[Brevo] To: ${payload.to.join(", ")}`);

    try {
      const recipients = payload.to.map((email) => ({ email }));

      const result = await client.transactionalEmails.sendTransacEmail({
        sender: { name: senderName, email: senderEmail },
        to: recipients,
        subject: payload.subject,
        htmlContent: payload.html,
      });

      const duration = Date.now() - startTime;

      console.log(`[Brevo] SUCCESS: Email sent in ${duration}ms`);
      console.log(`[Brevo] Subject: ${payload.subject}`);
      console.log(`[Brevo] Recipients: ${payload.to.join(", ")}`);

      const stats = await trackEmailAndCheck();
      await checkUsageAlert(stats);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Brevo] ERROR: Failed to send email after ${duration}ms`);
      console.error(`[Brevo] Subject: ${payload.subject}`);
      console.error(`[Brevo] Recipients: ${payload.to.join(", ")}`);

      if (error instanceof Error) {
        console.error(`[Brevo] Error: ${error.message}`);
      }

      if (error && typeof error === "object" && "body" in error) {
        const errorBody = (error as { body?: unknown }).body;
        console.error(`[Brevo] Response:`, JSON.stringify(errorBody, null, 2));
      }
    }
  },
};
