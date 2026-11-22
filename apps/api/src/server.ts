import 'dotenv/config';

import { createApp } from './app';
import { loadEnvironment, parseCorsOrigins } from './env';
import { SupabaseAuthService, SupabaseDataStore } from './supabase';

const environment = loadEnvironment();
const app = createApp({
  auth: new SupabaseAuthService(
    environment.SUPABASE_URL,
    environment.SUPABASE_PUBLISHABLE_KEY,
  ),
  store: new SupabaseDataStore(
    environment.SUPABASE_URL,
    environment.SUPABASE_SECRET_KEY,
  ),
  config: {
    allowedOrigins: parseCorsOrigins(environment.CORS_ORIGINS),
    bKashAccountNumber: environment.BKASH_ACCOUNT_NUMBER,
    deviceHashPepper: environment.DEVICE_HASH_PEPPER,
    environment: environment.NODE_ENV,
  },
});

const server = app.listen(environment.PORT, () => {
  console.info(`HomeXBD API listening on port ${environment.PORT}`);
});

function shutdown(signal: string): void {
  console.info(`${signal} received; closing the HTTP server.`);
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
