import mongoose, { Schema, Document } from 'mongoose';
import { Action } from '../../types/index.js';

export interface IModCase extends Document {
  guildId: string;
  caseNumber: number;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  action: Action;
  reason: string;
  timestamp: number;
  logMessageId?: string | null;
}

const ModCaseSchema = new Schema<IModCase>(
  {
    guildId: { type: String, required: true, index: true },
    caseNumber: { type: Number, required: true },
    targetId: { type: String, required: true, index: true },
    targetTag: { type: String, required: true },
    moderatorId: { type: String, required: true },
    moderatorTag: { type: String, required: true },
    action: { type: String, required: true },
    reason: { type: String, required: true },
    timestamp: { type: Number, required: true },
    logMessageId: { type: String, default: null }
  },
  { timestamps: true }
);

ModCaseSchema.index({ guildId: 1, caseNumber: 1 }, { unique: true });
ModCaseSchema.index({ guildId: 1, targetId: 1 });

export const ModCaseModel = mongoose.model<IModCase>('ModCase', ModCaseSchema);
