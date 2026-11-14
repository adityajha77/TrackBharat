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
