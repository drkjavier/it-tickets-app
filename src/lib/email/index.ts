import type { EmailPayload } from "./types";
import { getEmailProvider } from "./providers";
import { getThreadHeaders } from "./templates";
import {
  ticketCreatedEmailHtml,
  ticketAssignedEmailHtml,
  notificationEmailHtml,
} from "./templates";

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const provider = getEmailProvider();
  await provider.sendEmail(payload);
}

export async function sendTicketCreatedEmail(
  ticketCode: string,
  ticketId: string,
  ticketTitle: string,
  recipients: string[]
): Promise<void> {
  const uniqueRecipients = [...new Set(recipients)];

  await sendEmail({
    to: uniqueRecipients,
    subject: `[Ticket ${ticketCode}] ${ticketTitle}`,
    headers: getThreadHeaders(ticketId),
    html: ticketCreatedEmailHtml(ticketCode, ticketId, ticketTitle),
  });
}

export async function sendTicketAssignedEmail(
  ticketCode: string,
  ticketId: string,
  ticketTitle: string,
  assigneeName: string,
  recipients: string[]
): Promise<void> {
  const uniqueRecipients = [...new Set(recipients)];

  await sendEmail({
    to: uniqueRecipients,
    subject: `[Ticket ${ticketCode}] ${ticketTitle}`,
    headers: getThreadHeaders(ticketId),
    html: ticketAssignedEmailHtml(ticketCode, ticketId, ticketTitle, assigneeName),
  });
}

export async function sendNotificationEmail(
  ticketCode: string,
  ticketId: string,
  ticketTitle: string,
  fromStatus: string,
  toStatus: string,
  recipients: string[]
): Promise<void> {
  const uniqueRecipients = [...new Set(recipients)];

  await sendEmail({
    to: uniqueRecipients,
    subject: `[Ticket ${ticketCode}] ${ticketTitle}`,
    headers: getThreadHeaders(ticketId),
    html: notificationEmailHtml(ticketCode, ticketId, ticketTitle, fromStatus, toStatus),
  });
}

export { getUsageStats } from "./usage-tracker";
export type { EmailPayload, EmailProvider, EmailProviderType } from "./types";
