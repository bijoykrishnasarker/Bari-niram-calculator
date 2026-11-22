import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4_000),
  CORS_ORIGINS: z.string().default(''),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20),
  DEVICE_HASH_PEPPER: z.string().min(32),
  BKASH_ACCOUNT_NUMBER: z.string().trim().default(''),
});

export type ApiEnvironment = z.infer<typeof EnvSchema>;

export function loadEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): ApiEnvironment {
  return EnvSchema.parse(source);
}

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
