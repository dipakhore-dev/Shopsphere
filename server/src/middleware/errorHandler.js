import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Converts any thrown error into the standard JSON error envelope.
 * Internal details (stack traces, driver messages) are never leaked in production.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let errors;
  let code;
  let details;

  if (err instanceof ApiError) {
    errors = err.errors;
    code = err.code;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for "${err.path}"`;
  } else if (err?.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyPattern || {});
    message = fields.length ? `Duplicate value for: ${fields.join(', ')}` : 'Duplicate value';
  } else if (err?.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON in request body';
  } else if (err?.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large';
  } else if (err?.name === 'MulterError') {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    statusCode = tooBig ? 413 : 400;
    message = tooBig ? 'Each image must be 5 MB or smaller' : 'You can upload up to 6 images at a time';
  } else if (typeof err.message === 'string' && err.message.includes('not allowed by CORS')) {
    statusCode = 403;
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} ->`, err);
    if (env.isProduction) message = 'Internal server error';
  }

  const body = { success: false, message };
  if (code) body.code = code;
  if (details) {
    body.details = details;
    if (details.retryAfterSeconds) res.set('Retry-After', String(details.retryAfterSeconds));
  }
  if (errors) body.errors = errors;
  if (!env.isProduction && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
}
