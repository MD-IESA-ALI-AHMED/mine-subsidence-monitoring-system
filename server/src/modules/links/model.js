import mongoose from 'mongoose';
import { LINK_KINDS } from '@subsidence/shared';

const linkSchema = new mongoose.Schema(
  {
    _id: String,
    siteId: { type: String, required: true, index: true },
    from: String,
    to: String,
    kind: { type: String, enum: LINK_KINDS },
    quality_0to1: Number,
  },
  { versionKey: false },
);

export const Link = mongoose.model('Link', linkSchema, 'links');
