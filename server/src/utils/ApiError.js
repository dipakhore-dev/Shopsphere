/**
 * Operational error that is safe to show to API clients.
 * Throw it anywhere; the central error handler converts it to JSON.
 *
 * `code` is a stable machine-readable string (e.g. "CSRF_INVALID") that the
 * frontend can branch on without parsing human-readable messages.
 */
export class ApiError extends Error {
  constructor(statusCode, message, errors = undefined, code = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = 'Bad request', errors, code) {
    return new ApiError(400, message, errors, code);
  }
  static unauthorized(message = 'Authentication required', code) {
    return new ApiError(401, message, undefined, code);
  }
  static forbidden(message = 'You do not have permission to perform this action', code) {
    return new ApiError(403, message, undefined, code);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }
  static tooMany(message = 'Too many requests', code) {
    return new ApiError(429, message, undefined, code);
  }
}
