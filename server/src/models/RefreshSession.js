import mongoose from 'mongoose';

/**
 * One row per issued refresh token.
 *
 * - Only the SHA-256 hash of the token is stored.
 * - `family` links every token that descends from one login. When an
 *   already-rotated token is replayed (theft signal) the whole family is revoked.
 */
const refreshSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    revokedReason: {
      type: String,
      enum: ['rotated', 'logout', 'reuse_detected', 'password_reset', 'account_disabled'],
    },
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'RefreshSession' },
    userAgent: { type: String, maxlength: 512 },
    ip: { type: String, maxlength: 64 },
  },
  { timestamps: true },
);

// MongoDB deletes the document automatically once expiresAt has passed.
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshSession =
  mongoose.models.RefreshSession || mongoose.model('RefreshSession', refreshSessionSchema);
