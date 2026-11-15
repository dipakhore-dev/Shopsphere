import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './utils/logger.js';

let server;

async function start() {
  try {
    await connectDB();
  } catch (err) {
    logger.error('Could not connect to MongoDB:', err.message);
    logger.error('Check MONGODB_URI in server/.env and your Atlas Network Access (IP allow-list).');
    process.exit(1);
  }

  server = app.listen(env.PORT, () => {
    logger.info(`ShopSphere API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

async function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  // Force exit if graceful shutdown hangs.
  const timer = setTimeout(() => process.exit(1), 10_000);
  timer.unref();

  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason);
  shutdown('unhandledRejection');
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  shutdown('uncaughtException');
});

start();
