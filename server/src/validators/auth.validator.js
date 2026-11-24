import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

// bcrypt only uses the first 72 BYTES, so longer passwords are rejected rather than silently truncated.
// NOTE: in Zod 3, .refine() returns a ZodEffects that no longer has string methods such as
// .regex(), so every string check goes first and .refine() always comes last.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password is too long (max 72 bytes)');

const name = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(60, 'Name must be at most 60 characters')
  .refine((v) => !/[<>]/.test(v), 'Name cannot contain < or >');

const token = z.string().min(20, 'Invalid token').max(200, 'Invalid token');

export const registerSchema = z.object({ name, email, password });

// No strength rules at login: we only check what the user actually registered with.
export const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required').max(128) });

export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token, password });
export const verifyEmailSchema = z.object({ token });

// Logged-in users send {}. Logged-out users must send the email address to re-send to.
export const resendVerificationSchema = z.object({ email: email.optional() });
