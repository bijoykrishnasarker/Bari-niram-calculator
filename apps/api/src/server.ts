import 'dotenv/config';

import defaultHandler, { getOrInitDefaultApp } from './app';

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
