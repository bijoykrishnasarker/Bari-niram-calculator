import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(currentDir, '../.env'),
  path.resolve(currentDir, '.env'),
];
for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

import defaultHandler, { getOrInitDefaultApp } from './app.js';

if (!process.env.VERCEL) {
  try {
    const app = getOrInitDefaultApp();
    const port = Number(process.env.PORT) || 4000;
    const server = app.listen(port, () => {
      console.info(`HomeXBD API listening on port ${port}`);
    });

    const shutdown = (signal: string): void => {
      console.info(`${signal} received; closing the HTTP server.`);
      server.close((error) => {
        if (error) {
          console.error(error);
          process.exitCode = 1;
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to initialize server:', error);
  }
}

export default defaultHandler;
