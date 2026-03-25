import { prisma } from "./prisma";

export const RATE_LIMITS = {
  upload:   { perMinute: 5,  perDay: 40 },
  chat:     { perMinute: 5,  perDay: 40 },
  feedback: { perMinute: 5,  perDay: 20 },
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remainingMinute: number;
  remainingDay: number;
  minuteResetAt: Date;
  dayResetAt: Date;
}

export async function checkRateLimit(
  identifier: string,
  type: "upload" | "chat" | "feedback"
): Promise<RateLimitResult> {
  const limits = RATE_LIMITS[type];
  const now = new Date();

  const row = await prisma.rateLimit.findUnique({
    where: { identifier_type: { identifier, type } },
  });

  if (!row) {
    // No row means no usage yet — fully allowed
    const minuteResetAt = new Date(now.getTime() + 60_000);
    const dayResetAt = new Date(now.getTime() + 86_400_000);
    return {
      allowed: true,
      remainingMinute: limits.perMinute,
      remainingDay: limits.perDay,
      minuteResetAt,
      dayResetAt,
    };
  }

  // Compute effective counts, resetting stale windows
  const minuteExpired = now >= row.minuteResetAt;
  const dayExpired = now >= row.dayResetAt;

  const effectiveMinuteCount = minuteExpired ? 0 : row.minuteCount;
  const effectiveDayCount = dayExpired ? 0 : row.dayCount;

  const remainingMinute = Math.max(0, limits.perMinute - effectiveMinuteCount);
  const remainingDay = Math.max(0, limits.perDay - effectiveDayCount);

  const allowed = remainingMinute > 0 && remainingDay > 0;

  return {
    allowed,
    remainingMinute,
    remainingDay,
    minuteResetAt: minuteExpired
      ? new Date(now.getTime() + 60_000)
      : row.minuteResetAt,
    dayResetAt: dayExpired
      ? new Date(now.getTime() + 86_400_000)
      : row.dayResetAt,
  };
}

export async function incrementRateLimit(
  identifier: string,
  type: "upload" | "chat" | "feedback"
): Promise<void> {
  const now = new Date();
  const newMinuteResetAt = new Date(now.getTime() + 60_000);
  const newDayResetAt = new Date(now.getTime() + 86_400_000);

  const existing = await prisma.rateLimit.findUnique({
    where: { identifier_type: { identifier, type } },
  });

  if (!existing) {
    await prisma.rateLimit.create({
      data: {
        identifier,
        type,
        minuteCount: 1,
        minuteResetAt: newMinuteResetAt,
        dayCount: 1,
        dayResetAt: newDayResetAt,
      },
    });
    return;
  }

  const minuteExpired = now >= existing.minuteResetAt;
  const dayExpired = now >= existing.dayResetAt;

  await prisma.rateLimit.update({
    where: { identifier_type: { identifier, type } },
    data: {
      minuteCount: minuteExpired ? 1 : existing.minuteCount + 1,
      minuteResetAt: minuteExpired ? newMinuteResetAt : existing.minuteResetAt,
      dayCount: dayExpired ? 1 : existing.dayCount + 1,
      dayResetAt: dayExpired ? newDayResetAt : existing.dayResetAt,
    },
  });
}
