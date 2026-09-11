export interface EmailPayload {
  to: string[];
  subject: string;
  html: string;
  headers?: Record<string, string>;
}

export interface EmailProvider {
  name: 'resend' | 'brevo';
  sendEmail(payload: EmailPayload): Promise<void>;
}

export type EmailProviderType = 'resend' | 'brevo';
