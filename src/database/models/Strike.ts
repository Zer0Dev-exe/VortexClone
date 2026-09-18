import mongoose, { Schema, Document } from 'mongoose';

export interface IStrike extends Document {
  guildId: string;
  userId: string;
  strikes: number;
  updatedAt: number;
}

const StrikeSchema = new Schema<IStrike>({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  strikes: { type: Number, default: 0 },
  updatedAt: { type: Number, default: () => Date.now() }
});

StrikeSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const StrikeModel = mongoose.model<IStrike>('Strike', StrikeSchema);
