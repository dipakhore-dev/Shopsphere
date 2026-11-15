/** Mirrors server/src/validators/auth.validator.js so users get instant feedback. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const passwordRules = {
  required: 'Enter a password',
  minLength: { value: 8, message: 'Use at least 8 characters' },
  validate: {
    letter: (v) => /[A-Za-z]/.test(v) || 'Include at least one letter',
    number: (v) => /\d/.test(v) || 'Include at least one number',
    bytes: (v) => new TextEncoder().encode(v).length <= 72 || 'Password is too long',
  },
};
