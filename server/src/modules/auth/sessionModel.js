import mongoose from 'mongoose';

// One document per issued refresh token. Rotation marks the old token replaced; presenting a
// replaced token again (outside a short grace window for parallel tabs) revokes the whole family.
const sessionSchema = new mongoose.Schema(
  {
    _id: { type: String }, // jti
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    replacedBy: { type: String, default: null },
    replacedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model('Session', sessionSchema, 'sessions');
