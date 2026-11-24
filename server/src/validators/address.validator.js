import { z } from 'zod';
import { INDIAN_STATES } from '../utils/constants.js';

const noBrackets = (v) => !/[<>]/.test(v);
const text = (min, max, label) =>
  z.string().trim().min(min, `${label} is too short`).max(max, `${label} is too long`).refine(noBrackets, `${label} cannot contain < or >`);

// Accepts "98765 43210", "+91-9876543210", "09876543210" and stores 10 digits.
const phone = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, ''))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'));

const addressBase = z.object({
  fullName: text(2, 80, 'Name'),
  phone,
  line1: text(3, 120, 'Address line 1'),
  line2: text(0, 120, 'Address line 2'),
  landmark: text(0, 80, 'Landmark'),
  city: text(2, 60, 'City'),
  state: z.enum(INDIAN_STATES, { errorMap: () => ({ message: 'Choose a valid state' }) }),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  type: z.enum(['home', 'work', 'other']),
  isDefault: z.boolean(),
});

export const createAddressSchema = addressBase.partial({ line2: true, landmark: true, type: true, isDefault: true });
export const updateAddressSchema = addressBase.partial();
