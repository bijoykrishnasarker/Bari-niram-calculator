import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4_000),
  CORS_ORIGINS: z.string().trim().default(''),
  SUPABASE_URL: z.string().trim().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(20),
  SUPABASE_SECRET_KEY: z.string().trim().min(20),
  DEVICE_HASH_PEPPER: z.string().trim().min(32),
  BKASH_ACCOUNT_NUMBER: z.string().trim().default(''),
});

export type ApiEnvironment = z.infer<typeof EnvSchema>;

export function loadEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): ApiEnvironment {
  const merged = {
    ...source,
    SUPABASE_URL: (source.SUPABASE_URL || source.EXPO_PUBLIC_SUPABASE_URL || '').trim(),
    SUPABASE_PUBLISHABLE_KEY: (
      source.SUPABASE_PUBLISHABLE_KEY ||
      source.SUPABASE_ANON_KEY ||
      source.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      ''
    ).trim(),
    SUPABASE_SECRET_KEY: (
      source.SUPABASE_SECRET_KEY ||
      source.SUPABASE_SERVICE_ROLE_KEY ||
      ''
    ).trim(),
    DEVICE_HASH_PEPPER: (source.DEVICE_HASH_PEPPER || '').trim(),
    BKASH_ACCOUNT_NUMBER: (source.BKASH_ACCOUNT_NUMBER || '').trim(),
  };
  return EnvSchema.parse(merged);
}

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
