import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { sendSuccess } from '../utils/apiResponse.js';

const DB_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export function getHealth(_req, res) {
  sendSuccess(res, {
    message: 'ShopSphere API is running',
    data: {
      status: 'ok',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: DB_STATES[mongoose.connection.readyState] ?? 'unknown',
    },
  });
}
