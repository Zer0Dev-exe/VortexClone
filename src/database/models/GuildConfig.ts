import mongoose, { Schema, Document } from 'mongoose';
import { Action } from '../../types/index.js';

export interface IGuildConfig extends Document {
  guildId: string;
  prefix: string;
  channels: {
    modlog?: string | null;
    serverlog?: string | null;
    messagelog?: string | null;
    voicelog?: string | null;
    avatarlog?: string | null;
  };
  roles: {
    modRole?: string | null;
    muteRole?: string | null;
  };
  raidMode: boolean;
  timezone: string;
  automod: {
    antiInvite: number; // 0 = off, 1 = del, >1 = strikes
    antiCopypasta: number;
    antiEveryone: number;
    antiReferral: number;
    antiDuplicate: number;
    dupeDeleteThresh: number;
    dupeStrikeThresh: number;
    maxLines: number;
    maxMentions: number;
    autoDehoist: string;
    autoRaidModeNumber: number;
    autoRaidModeTime: number;
    resolveUrls: number;
  };
  punishments: Array<{
    strikeCount: number;
    action: Action;
    durationSeconds: number;
  }>;
  ignores: Array<{
    entityId: string;
    type: 'channel' | 'role' | 'user';
  }>;
  inviteWhitelist: string[];
  filters: Array<{
    id: number;
    pattern: string;
    isRegex: boolean;
    strikes: number;
  }>;
}

const GuildConfigSchema = new Schema<IGuildConfig>(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    prefix: { type: String, default: '>>' },
    channels: {
      modlog: { type: String, default: null },
      serverlog: { type: String, default: null },
      messagelog: { type: String, default: null },
      voicelog: { type: String, default: null },
      avatarlog: { type: String, default: null }
    },
    roles: {
      modRole: { type: String, default: null },
      muteRole: { type: String, default: null }
    },
    raidMode: { type: Boolean, default: false },
    timezone: { type: String, default: 'UTC' },
    automod: {
      antiInvite: { type: Number, default: 1 },
      antiCopypasta: { type: Number, default: 0 },
      antiEveryone: { type: Number, default: 1 },
      antiReferral: { type: Number, default: 0 },
      antiDuplicate: { type: Number, default: 0 },
      dupeDeleteThresh: { type: Number, default: 2 },
      dupeStrikeThresh: { type: Number, default: 4 },
      maxLines: { type: Number, default: 0 },
      maxMentions: { type: Number, default: 0 },
      autoDehoist: { type: String, default: '' },
      autoRaidModeNumber: { type: Number, default: 0 },
      autoRaidModeTime: { type: Number, default: 10 },
      resolveUrls: { type: Number, default: 0 }
    },
    punishments: [
      {
        strikeCount: { type: Number, required: true },
        action: { type: String, required: true },
        durationSeconds: { type: Number, default: 0 }
      }
    ],
    ignores: [
      {
        entityId: { type: String, required: true },
        type: { type: String, required: true }
      }
    ],
    inviteWhitelist: [{ type: String }],
    filters: [
      {
        id: { type: Number, required: true },
        pattern: { type: String, required: true },
        isRegex: { type: Boolean, default: false },
        strikes: { type: Number, default: 1 }
      }
    ]
  },
  { timestamps: true }
);

export const GuildConfigModel = mongoose.model<IGuildConfig>('GuildConfig', GuildConfigSchema);
