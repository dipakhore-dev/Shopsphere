import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * All environment variables are validated once at startup.
 * If something is missing the process exits with a readable message
 * instead of failing later with a confusing runtime error.
 */

// Treat "KEY=" (empty) in .env the same as "not set".
const emptyToUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  MONGODB_URI: z
    .string({ required_error: 'MONGODB_URI is required' })
    .min(1, 'MONGODB_URI cannot be empty')
    .refine((v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'), {
      message: 'MONGODB_URI must start with mongodb:// or mongodb+srv://',
    }),

  CLIENT_URL: z.string().default('http://localhost:5173'),

  // ---- auth ----
  JWT_ACCESS_SECRET: z
    .string({ required_error: 'JWT_ACCESS_SECRET is required' })
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters (see .env.example for a generator)'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  // ---- cookies ----
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_SECURE: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),

  // ---- email ----
  SMTP_HOST: optionalString,
  SMTP_PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(587)),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SMTP_SECURE: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
  EMAIL_VERIFICATION_TTL_MINUTES: z.preprocess(emptyToUndefined, z.coerce.number().int().min(5).max(1440).default(30)),
  EMAIL_RESEND_COOLDOWN_SECONDS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(3600).default(60)),
  EMAIL_FROM: z.string().default('ShopSphere <no-reply@shopsphere.local>'),

  // ---- image uploads (Cloudinary) ----
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
});

function fail(lines) {
  console.error(`\nInvalid environment configuration:\n${lines.map((l) => `  - ${l}`).join('\n')}\n`);
  console.error('Copy server/.env.example to server/.env and fill in the values.\n');
  process.exit(1);
}

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  fail(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === 'production';
const cookieSecure = raw.COOKIE_SECURE !== undefined ? raw.COOKIE_SECURE === 'true' : isProduction;

// Browsers reject SameSite=None cookies that are not Secure.
if (raw.COOKIE_SAME_SITE === 'none' && !cookieSecure) {
  fail(['COOKIE_SAME_SITE=none requires secure cookies (COOKIE_SECURE=true and HTTPS)']);
}

// Google displays App Passwords in groups ("abcd efgh ijkl mnop"); the spaces are not part of the password.
const smtpPass = raw.SMTP_PASS?.replace(/\s+/g, '');

if (raw.SMTP_HOST && Boolean(raw.SMTP_USER) !== Boolean(smtpPass)) {
  fail(['SMTP_USER and SMTP_PASS must be set together']);
}
if (raw.SMTP_HOST?.includes('gmail.com') && !(raw.SMTP_USER && smtpPass)) {
  fail(['Gmail SMTP needs SMTP_USER (your Gmail address) and SMTP_PASS (a Google App Password)']);
}
// Without SMTP, emails are only SIMULATED. Production must never pretend to send mail.
if (isProduction && !raw.SMTP_HOST) {
  fail(['SMTP_HOST, SMTP_USER and SMTP_PASS are required in production (verification emails cannot be simulated there)']);
}

const clientOrigins = raw.CLIENT_URL.split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const env = Object.freeze({
  ...raw,
  isProduction,
  isTest: raw.NODE_ENV === 'test',
  clientOrigins,
  clientUrl: clientOrigins[0],
  cookie: Object.freeze({ secure: cookieSecure, sameSite: raw.COOKIE_SAME_SITE }),
  cloudinary: Object.freeze({
    cloudName: raw.CLOUDINARY_CLOUD_NAME,
    apiKey: raw.CLOUDINARY_API_KEY,
    apiSecret: raw.CLOUDINARY_API_SECRET,
    configured: Boolean(raw.CLOUDINARY_CLOUD_NAME && raw.CLOUDINARY_API_KEY && raw.CLOUDINARY_API_SECRET),
  }),
  smtp: Object.freeze({
    host: raw.SMTP_HOST,
    port: raw.SMTP_PORT,
    user: raw.SMTP_USER,
    pass: smtpPass,
    // true = TLS from the first byte (port 465). false = plain connection upgraded with STARTTLS (port 587).
    secure: raw.SMTP_SECURE ? raw.SMTP_SECURE === 'true' : raw.SMTP_PORT === 465,
  }),
  email: Object.freeze({
    verificationTtlMs: raw.EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000,
    verificationTtlMinutes: raw.EMAIL_VERIFICATION_TTL_MINUTES,
    resendCooldownMs: raw.EMAIL_RESEND_COOLDOWN_SECONDS * 1000,
    resendCooldownSeconds: raw.EMAIL_RESEND_COOLDOWN_SECONDS,
  }),
});
