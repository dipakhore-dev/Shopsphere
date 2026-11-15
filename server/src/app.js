import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import routes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { sanitizeRequest } from './middleware/sanitize.js';
import { csrfProtection } from './middleware/csrf.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

/**
 * The Express app is created here WITHOUT connecting to the database or
 * listening on a port, so automated tests can import it directly.
 * server.js is responsible for connecting to MongoDB and calling listen().
 */
const app = express();

app.disable('x-powered-by');
// Render (and most hosts) sit behind a reverse proxy. Needed so rate limiting
// sees the real client IP and "secure" cookies work.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors(corsOptions));

// NOTE (Phase 7): the Razorpay webhook needs the RAW body to verify its
// signature, so it will be mounted before express.json().
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser());
app.use(sanitizeRequest);

if (!env.isTest) {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
}

app.use('/api', apiLimiter);
app.use('/api', csrfProtection);
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
