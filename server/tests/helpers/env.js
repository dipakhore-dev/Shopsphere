// Import this file FIRST in every test so config/env.js sees these values.
Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/shopsphere_test', // never connected to; the in-memory DB is used
  JWT_ACCESS_SECRET: 'test-secret-'.padEnd(48, 'x'),
  BCRYPT_ROUNDS: '4', // fast hashing in tests
  CLIENT_URL: 'http://localhost:5173',
  DISABLE_RATE_LIMIT: 'true',
  EMAIL_VERIFICATION_TTL_MINUTES: '30',
  EMAIL_RESEND_COOLDOWN_SECONDS: '60',
  CLOUDINARY_CLOUD_NAME: 'testcloud', // fake: uploads go to an in-memory adapter in tests
  CLOUDINARY_API_KEY: 'test',
  CLOUDINARY_API_SECRET: 'test',
});
