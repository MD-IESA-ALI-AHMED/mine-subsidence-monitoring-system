import mongoose from 'mongoose';

// Append-only. The service exposes insert and list only; nothing updates or deletes.
const auditSchema = new mongoose.Schema(
  {
    ts: { type: Date, default: Date.now },
    userId: { type: String, default: null },
    action: { type: String, required: true },
    target: { type: String, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { versionKey: false },
);
auditSchema.index({ ts: -1 });

export const AuditLog = mongoose.model('AuditLog', auditSchema, 'auditLog');
