import { z } from "zod";

/**
 * 12-factor config: all configuration comes from environment variables, and it
 * is validated ONCE at startup. If something is missing, the process crashes
 * immediately with a clear message, instead of failing later at 2am on the first
 * request that happens to need it.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.url(),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),
  PINCODE_CACHE_TTL_DAYS: z.coerce.number().int().positive().default(30),
  INDIA_POST_BASE_URL: z.url().default("https://api.postalpincode.in"),
  /** Where re-encoded issue photos are stored (a Docker volume in production). */
  UPLOADS_DIR: z.string().default("./.uploads"),
  /** Leader photos (free-licence, from the parties import). Production ships them inside the image. */
  LEADER_PHOTOS_DIR: z.string().optional(),
  /**
   * Citizens' photos in Supabase Storage instead of local disk (for hosts without a
   * persistent disk, e.g. Render's free plan). Both set = on. The service-role key
   * stays on this server only. Supabase → Project Settings → API.
   */
  SUPABASE_URL: z.url().refine((u) => /^https:\/\/[^/@]+\/?$/.test(u), "must be the Project URL, like https://abcd.supabase.co (not the database connection string)").optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_PHOTOS_BUCKET: z.string().default("issue-photos"),
  /** Public web address, used in email links. */
  WEB_URL: z.url().default("http://localhost:3000"),
  /** e.g. smtps://user:pass@smtp.example.com:465. Unset = dev outbox (emails kept in memory, shown at /dev/outbox). */
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default("TrackBharat <no-reply@trackbharat.local>"),
  /** Brevo API key: email over HTTPS, for hosts that block SMTP (Render free). Takes priority over SMTP_URL. */
  BREVO_API_KEY: z.string().optional(),
  /** This API's public address (Google sends people back to <PUBLIC_API_URL>/v1/auth/google/callback). */
  PUBLIC_API_URL: z.url().default("http://localhost:4000"),
  /** "Continue with Google". Both unset = the button is hidden. From Google Cloud → APIs & Services → Clients. */
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\nSee apps/api/.env.example`);
  }
  return parsed.data;
}
