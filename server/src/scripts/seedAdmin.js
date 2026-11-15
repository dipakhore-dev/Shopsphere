/**
 * One-time, operator-run script that provisions the first admin account.
 * Admins can NEVER be created through the public API.
 *
 *   1. set ADMIN_EMAIL / ADMIN_PASSWORD (and optionally ADMIN_NAME) in server/.env
 *   2. npm run seed:admin
 *   3. delete ADMIN_PASSWORD from server/.env
 */
import { z } from 'zod';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { ROLES } from '../utils/constants.js';

const schema = z.object({
  ADMIN_NAME: z.string().trim().min(2).default('Platform Admin'),
  ADMIN_EMAIL: z.string().trim().toLowerCase().email('ADMIN_EMAIL must be a valid email'),
  ADMIN_PASSWORD: z
    .string()
    .min(12, 'ADMIN_PASSWORD must be at least 12 characters')
    .regex(/[a-z]/, 'ADMIN_PASSWORD needs a lowercase letter')
    .regex(/[A-Z]/, 'ADMIN_PASSWORD needs an uppercase letter')
    .regex(/\d/, 'ADMIN_PASSWORD needs a number'),
});

async function main() {
  const parsed = schema.safeParse({
    ADMIN_NAME: process.env.ADMIN_NAME || undefined,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  });

  if (!parsed.success) {
    console.error('Cannot create admin:');
    parsed.error.issues.forEach((i) => console.error(`  - ${i.message}`));
    process.exitCode = 1;
    return;
  }

  const { ADMIN_NAME: name, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = parsed.data;
  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role === ROLES.ADMIN) {
      console.log(`Admin already exists: ${email}`);
    } else {
      existing.role = ROLES.ADMIN;
      existing.isEmailVerified = true;
      await existing.save();
      console.log(`Existing account promoted to admin: ${email}`);
    }
    return;
  }

  await User.create({ name, email, password, role: ROLES.ADMIN, isEmailVerified: true });
  console.log(`Admin created: ${email}`);
  console.log('Now remove ADMIN_PASSWORD from server/.env.');
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
