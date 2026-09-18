import mongoose, { Schema, Document } from 'mongoose';
import { Action } from '../../types/index.js';

export interface ITempPunishment extends Document {
  guildId: string;
  userId: string;
  action: Action;
  expiresAt: number;
  createdAt: number;
}

const TempPunishmentSchema = new Schema<ITempPunishment>({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  expiresAt: { type: Number, required: true, index: true },
  createdAt: { type: Number, default: () => Date.now() }
});

export const TempPunishmentModel = mongoose.model<ITempPunishment>('TempPunishment', TempPunishmentSchema);
