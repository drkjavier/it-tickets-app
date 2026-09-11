import { prisma } from "@/lib/prisma";
import type { EmailProviderType } from "./types";

const DAILY_LIMITS: Record<EmailProviderType, number> = {
  brevo: 300,
  resend: 100,
};

function getWarningThreshold(provider: EmailProviderType): number {
  if (provider === "brevo") {
    return Number(process.env.EMAIL_WARNING_THRESHOLD_BREVO) || 280;
  }
  return Number(process.env.EMAIL_WARNING_THRESHOLD_RESEND) || 85;
}

export interface UsageStats {
  count: number;
  limit: number;
  provider: EmailProviderType;
  shouldAlert: boolean;
}

export async function trackEmailAndCheck(): Promise<UsageStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const provider = (process.env.EMAIL_PROVIDER || "brevo") as EmailProviderType;

  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    INSERT INTO "email_daily_usage" (date, count, provider)
    VALUES (${today}::date, 1, ${provider})
    ON CONFLICT (date) DO UPDATE
    SET count = "email_daily_usage".count + 1,
        provider = ${provider},
        updated_at = NOW()
    WHERE "email_daily_usage".date = ${today}::date
    RETURNING count
  `;

  const count = Number(result[0].count);
  const threshold = getWarningThreshold(provider);

  return {
    count,
    limit: DAILY_LIMITS[provider],
    provider,
    shouldAlert: count >= threshold,
  };
}

export async function getUsageStats(): Promise<UsageStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const provider = (process.env.EMAIL_PROVIDER || "brevo") as EmailProviderType;

  const record = await prisma.emailDailyUsage.findUnique({
    where: { date: today },
  });

  const count = record?.count ?? 0;

  return {
    count,
    limit: DAILY_LIMITS[provider],
    provider,
    shouldAlert: count >= getWarningThreshold(provider),
  };
}
