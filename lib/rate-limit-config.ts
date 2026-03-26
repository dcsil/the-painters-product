export const RATE_LIMITS = {
  upload:   { perMinute: 5,  perDay: 40 },
  chat:     { perMinute: 5,  perDay: 40 },
  feedback: { perMinute: 5,  perDay: 20 },
} as const;
