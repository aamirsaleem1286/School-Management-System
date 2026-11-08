const DEV_AUTH_SECRET = "dev-only-ai-solution-it-school-erp-secret-key-change-me-2026";

export const env = {
  MONGODB_URI: process.env.MONGODB_URI || "",
  AUTH_SECRET:
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : DEV_AUTH_SECRET),
  AUTH_SESSION_TTL: Number(process.env.AUTH_SESSION_TTL || 60 * 60 * 24 * 7),
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  FILE_STORAGE: (process.env.FILE_STORAGE || "local") as "local" | "s3",
  SMTP: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "AI Solution IT School <no-reply@example.com>",
  },
  WHATSAPP: {
    token: process.env.WHATSAPP_API_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    version: process.env.WHATSAPP_API_VERSION || "v20.0",
  },
  SMS: {
    url: process.env.SMS_API_URL || "",
    key: process.env.SMS_API_KEY || "",
    sender: process.env.SMS_SENDER_ID || "",
  },
};

export function assertAuthSecret() {
  if (!env.AUTH_SECRET) {
    throw new Error(
      "AUTH_SECRET is required in production. Set a long random value in your environment."
    );
  }
  return env.AUTH_SECRET;
}
