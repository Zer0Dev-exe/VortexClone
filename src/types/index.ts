import {
  ChatInputCommandInteraction,
  Message,
  PermissionResolvable,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder
} from 'discord.js';
import type { Database } from '../database/Database.js';
import type { AutoMod } from '../automod/AutoMod.js';
import type { AntiRaid } from '../automod/AntiRaid.js';
import type { ModLogger } from '../logging/ModLogger.js';
import type { GuildLogger } from '../logging/GuildLogger.js';
import type { MessageCache } from '../logging/MessageCache.js';
import type { PunishmentScheduler } from '../scheduler/PunishmentScheduler.js';

declare module '@sapphire/pieces' {
  interface Container {
    db: Database;
    autoMod: AutoMod;
    antiRaid: AntiRaid;
    modLogger: ModLogger;
    guildLogger: GuildLogger;
    messageCache: MessageCache;
    scheduler: PunishmentScheduler;
  }
}

export enum Action {
  NONE = 'NONE',
  WARN = 'WARN',
  TEMPMUTE = 'TEMPMUTE',
  MUTE = 'MUTE',
  KICK = 'KICK',
  SOFTBAN = 'SOFTBAN',
  TEMPBAN = 'TEMPBAN',
  BAN = 'BAN',
  UNBAN = 'UNBAN',
  UNMUTE = 'UNMUTE',
  STRIKE = 'STRIKE',
  PARDON = 'PARDON',
  CLEAN = 'CLEAN',
  DELETE = 'DELETE',
  RAIDMODE = 'RAIDMODE',
  NORAIDMODE = 'NORAIDMODE'
}

export const ActionMeta: Record<Action, { verb: string; emoji: string; color: number }> = {
  [Action.NONE]: { verb: 'no actuó', emoji: '😶', color: 0x95a5a6 },
  [Action.WARN]: { verb: 'advertido', emoji: '🗣️', color: 0xf1c40f },
  [Action.TEMPMUTE]: { verb: 'silenciado temporalmente', emoji: '🤐', color: 0xe67e22 },
  [Action.MUTE]: { verb: 'silenciado', emoji: '🔇', color: 0xe67e22 },
  [Action.KICK]: { verb: 'expulsado', emoji: '👢', color: 0xe74c3c },
  [Action.SOFTBAN]: { verb: 'baneado suave (softban)', emoji: '🍌', color: 0xd35400 },
  [Action.TEMPBAN]: { verb: 'baneado temporalmente', emoji: '⏲️', color: 0xc0392b },
  [Action.BAN]: { verb: 'baneado', emoji: '🔨', color: 0x962d22 },
  [Action.UNBAN]: { verb: 'desbaneado', emoji: '🔧', color: 0x2ecc71 },
  [Action.UNMUTE]: { verb: 'des-silenciado', emoji: '🔊', color: 0x2ecc71 },
  [Action.STRIKE]: { verb: 'recibió strike', emoji: '🚩', color: 0xf39c12 },
  [Action.PARDON]: { verb: 'perdonado', emoji: '🏳️', color: 0x3498db },
  [Action.CLEAN]: { verb: 'mensajes limpiados', emoji: '🗑️', color: 0x7f8c8d },
  [Action.DELETE]: { verb: 'mensaje eliminado', emoji: '🗑️', color: 0x7f8c8d },
  [Action.RAIDMODE]: { verb: 'modo anti-raid activado', emoji: '🔒', color: 0x9b59b6 },
  [Action.NORAIDMODE]: { verb: 'modo anti-raid desactivado', emoji: '🔓', color: 0x1abc9c }
};

export interface GuildSettings {
  guild_id: string;
  prefix: string;
  modlog_channel_id: string | null;
  serverlog_channel_id: string | null;
  messagelog_channel_id: string | null;
  voicelog_channel_id: string | null;
  avatarlog_channel_id: string | null;
  mod_role_id: string | null;
  mute_role_id: string | null;
  raid_mode: number; // 0 or 1
  timezone: string;
}

export interface AutomodSettings {
  guild_id: string;
  anti_invite: number; // 0 = off, 1 = delete, >1 = strike count
  anti_copypasta: number; // strikes, 0 = off
  anti_everyone: number; // strikes, 0 = off
  anti_referral: number; // strikes, 0 = off
  anti_duplicate: number; // strikes, 0 = off
  dupe_delete_thresh: number; // default 2
  dupe_strike_thresh: number; // default 4
  max_lines: number; // 0 = off, >0 max lines threshold
  max_mentions: number; // 0 = off, >0 max mentions
  auto_dehoist: string; // empty or ascii char like '!'
  auto_raid_mode_number: number; // joins threshold
  auto_raid_mode_time: number; // seconds window
  resolve_urls: number; // 0 or 1
}

export interface ModCase {
  id: number;
  guild_id: string;
  case_number: number;
  target_id: string;
  target_tag: string;
  moderator_id: string;
  moderator_tag: string;
  action: Action;
  reason: string;
  timestamp: number;
  log_message_id?: string | null;
}

export interface StrikeRecord {
  guild_id: string;
  user_id: string;
  strikes: number;
  updated_at: number;
}

export interface PunishmentConfig {
  guild_id: string;
  strike_count: number;
  action: Action;
  duration_seconds: number; // e.g. 3600 for 1h mute
}

export interface TempPunishment {
  id: number;
  guild_id: string;
  user_id: string;
  action: Action; // TEMPMUTE, TEMPBAN
  expires_at: number;
  created_at: number;
}

export interface FilterItem {
  id: number;
  guild_id: string;
  pattern: string;
  is_regex: number;
  strikes: number;
}

export interface CommandContext {
  message?: Message;
  interaction?: ChatInputCommandInteraction;
  isSlash: boolean;
  guildId: string;
  authorId: string;
  reply: (content: string | { content?: string; embeds?: any[]; ephemeral?: boolean }) => Promise<any>;
}

export interface Command {
  name: string;
  description: string;
  category: 'moderation' | 'automod' | 'settings' | 'general';
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  slashData?:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  executeSlash?: (interaction: ChatInputCommandInteraction) => Promise<void>;
  executePrefix?: (message: Message, args: string[]) => Promise<void>;
}
