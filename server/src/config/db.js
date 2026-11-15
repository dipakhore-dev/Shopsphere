import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

let listenersAttached = false;

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err.message));
}

export async function connectDB() {
  attachListeners();

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
    // autoIndex builds the indexes declared in schemas. Convenient in
    // development; in production build indexes deliberately (see Phase 3).
    autoIndex: !env.isProduction,
  });

  const { host, name } = mongoose.connection;
  logger.info(`MongoDB connected -> ${host}/${name}`);
}

export async function disconnectDB() {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}
