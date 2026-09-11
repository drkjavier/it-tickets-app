import type { EmailProvider, EmailProviderType } from "../types";
import { brevoProvider } from "./brevo";
import { resendProvider } from "./resend";

export function getEmailProvider(): EmailProvider {
  const provider = (process.env.EMAIL_PROVIDER || "brevo") as EmailProviderType;

  switch (provider) {
    case "resend":
      return resendProvider;
    case "brevo":
    default:
      return brevoProvider;
  }
}

export { brevoProvider, resendProvider };
