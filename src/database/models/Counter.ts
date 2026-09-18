import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Document {
  guildId: string;
  field: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  guildId: { type: String, required: true },
  field: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

CounterSchema.index({ guildId: 1, field: 1 }, { unique: true });

export const CounterModel = mongoose.model<ICounter>('Counter', CounterSchema);

export async function getNextSequence(guildId: string, field = 'caseNumber'): Promise<number> {
  const result = await CounterModel.findOneAndUpdate(
    { guildId, field },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}
