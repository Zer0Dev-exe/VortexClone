import mongoose from 'mongoose';
import {
  GuildSettings,
  AutomodSettings,
  ModCase,
  PunishmentConfig,
  TempPunishment,
  FilterItem,
  Action
} from '../types/index.js';
import { GuildConfigModel, IGuildConfig } from './models/GuildConfig.js';
import { ModCaseModel } from './models/ModCase.js';
import { getNextSequence } from './models/Counter.js';
import { StrikeModel } from './models/Strike.js';
import { TempPunishmentModel } from './models/TempPunishment.js';

export class Database {
  // In-memory cache for GuildConfig to ensure 0ms network latency for AutoMod
  private configCache: Map<string, { config: IGuildConfig; expires: number }> = new Map();
  private cacheTtlMs = 60000; // 1 minute TTL

  public async connect(uri: string): Promise<void> {
    if (!uri) {
      throw new Error('MONGODB_URI no está definido en el entorno.');
    }

    mongoose.connection.on('connected', () => {
      console.log('🍃 Conectado exitosamente a MongoDB Atlas!');
    });

    mongoose.connection.on('error', err => {
      console.error('❌ Error en conexión a MongoDB Atlas:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ Desconectado de MongoDB Atlas. Reintentando...');
    });

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
  }

  public async disconnect(): Promise<void> {
    await mongoose.disconnect();
  }

  // --- Internal Config Fetcher with Cache ---
  public async getRawGuildConfig(guildId: string): Promise<IGuildConfig> {
    const cached = this.configCache.get(guildId);
    const now = Date.now();
    if (cached && cached.expires > now) {
      return cached.config;
    }

    let config = await GuildConfigModel.findOne({ guildId });
    if (!config) {
      config = await GuildConfigModel.create({ guildId });
    }

    this.configCache.set(guildId, { config, expires: now + this.cacheTtlMs });
    return config;
  }

  public invalidateCache(guildId: string): void {
    this.configCache.delete(guildId);
  }

  // --- Guild Settings ---
  public async getGuildSettings(guildId: string): Promise<GuildSettings> {
    const config = await this.getRawGuildConfig(guildId);
    return {
      guild_id: config.guildId,
      prefix: config.prefix || '>>',
      modlog_channel_id: config.channels.modlog || null,
      serverlog_channel_id: config.channels.serverlog || null,
      messagelog_channel_id: config.channels.messagelog || null,
      voicelog_channel_id: config.channels.voicelog || null,
      avatarlog_channel_id: config.channels.avatarlog || null,
      mod_role_id: config.roles.modRole || null,
      mute_role_id: config.roles.muteRole || null,
      raid_mode: config.raidMode ? 1 : 0,
      timezone: config.timezone || 'UTC'
    };
  }

  public async updateGuildSettings(guildId: string, partial: Partial<GuildSettings>): Promise<void> {
    const updates: any = {};
    if (partial.prefix !== undefined) updates.prefix = partial.prefix;
    if (partial.raid_mode !== undefined) updates.raidMode = partial.raid_mode === 1;
    if (partial.timezone !== undefined) updates.timezone = partial.timezone;

    if (partial.modlog_channel_id !== undefined) updates['channels.modlog'] = partial.modlog_channel_id;
    if (partial.serverlog_channel_id !== undefined) updates['channels.serverlog'] = partial.serverlog_channel_id;
    if (partial.messagelog_channel_id !== undefined) updates['channels.messagelog'] = partial.messagelog_channel_id;
    if (partial.voicelog_channel_id !== undefined) updates['channels.voicelog'] = partial.voicelog_channel_id;
    if (partial.avatarlog_channel_id !== undefined) updates['channels.avatarlog'] = partial.avatarlog_channel_id;

    if (partial.mod_role_id !== undefined) updates['roles.modRole'] = partial.mod_role_id;
    if (partial.mute_role_id !== undefined) updates['roles.muteRole'] = partial.mute_role_id;

    await GuildConfigModel.updateOne({ guildId }, { $set: updates }, { upsert: true });
    this.invalidateCache(guildId);
  }

  // --- Automod Settings ---
  public async getAutomodSettings(guildId: string): Promise<AutomodSettings> {
    const config = await this.getRawGuildConfig(guildId);
    const am = config.automod;
    return {
      guild_id: config.guildId,
      anti_invite: am.antiInvite ?? 1,
      anti_copypasta: am.antiCopypasta ?? 0,
      anti_everyone: am.antiEveryone ?? 1,
      anti_referral: am.antiReferral ?? 0,
      anti_duplicate: am.antiDuplicate ?? 0,
      dupe_delete_thresh: am.dupeDeleteThresh ?? 2,
      dupe_strike_thresh: am.dupeStrikeThresh ?? 4,
      max_lines: am.maxLines ?? 0,
      max_mentions: am.maxMentions ?? 0,
      auto_dehoist: am.autoDehoist ?? '',
      auto_raid_mode_number: am.autoRaidModeNumber ?? 0,
      auto_raid_mode_time: am.autoRaidModeTime ?? 10,
      resolve_urls: am.resolveUrls ?? 0
    };
  }

  public async updateAutomodSettings(guildId: string, partial: Partial<AutomodSettings>): Promise<void> {
    const updates: any = {};
    if (partial.anti_invite !== undefined) updates['automod.antiInvite'] = partial.anti_invite;
    if (partial.anti_copypasta !== undefined) updates['automod.antiCopypasta'] = partial.anti_copypasta;
    if (partial.anti_everyone !== undefined) updates['automod.antiEveryone'] = partial.anti_everyone;
    if (partial.anti_referral !== undefined) updates['automod.antiReferral'] = partial.anti_referral;
    if (partial.anti_duplicate !== undefined) updates['automod.antiDuplicate'] = partial.anti_duplicate;
    if (partial.dupe_delete_thresh !== undefined) updates['automod.dupeDeleteThresh'] = partial.dupe_delete_thresh;
    if (partial.dupe_strike_thresh !== undefined) updates['automod.dupeStrikeThresh'] = partial.dupe_strike_thresh;
    if (partial.max_lines !== undefined) updates['automod.maxLines'] = partial.max_lines;
    if (partial.max_mentions !== undefined) updates['automod.maxMentions'] = partial.max_mentions;
    if (partial.auto_dehoist !== undefined) updates['automod.autoDehoist'] = partial.auto_dehoist;
    if (partial.auto_raid_mode_number !== undefined) updates['automod.autoRaidModeNumber'] = partial.auto_raid_mode_number;
    if (partial.auto_raid_mode_time !== undefined) updates['automod.autoRaidModeTime'] = partial.auto_raid_mode_time;
    if (partial.resolve_urls !== undefined) updates['automod.resolveUrls'] = partial.resolve_urls;

    await GuildConfigModel.updateOne({ guildId }, { $set: updates }, { upsert: true });
    this.invalidateCache(guildId);
  }

  // --- Mod Cases ---
  public async createCase(
    guildId: string,
    targetId: string,
    targetTag: string,
    moderatorId: string,
    moderatorTag: string,
    action: Action,
    reason: string
  ): Promise<ModCase> {
    const caseNumber = await getNextSequence(guildId, 'caseNumber');
    const timestamp = Date.now();

    const doc = await ModCaseModel.create({
      guildId,
      caseNumber,
      targetId,
      targetTag,
      moderatorId,
      moderatorTag,
      action,
      reason,
      timestamp
    });

    return {
      id: doc._id.toString() as any,
      guild_id: guildId,
      case_number: caseNumber,
      target_id: targetId,
      target_tag: targetTag,
      moderator_id: moderatorId,
      moderator_tag: moderatorTag,
      action,
      reason,
      timestamp,
      log_message_id: null
    };
  }

  public async getCase(guildId: string, caseNumber: number): Promise<ModCase | undefined> {
    const doc = await ModCaseModel.findOne({ guildId, caseNumber });
    if (!doc) return undefined;
    return {
      id: doc._id.toString() as any,
      guild_id: doc.guildId,
      case_number: doc.caseNumber,
      target_id: doc.targetId,
      target_tag: doc.targetTag,
      moderator_id: doc.moderatorId,
      moderator_tag: doc.moderatorTag,
      action: doc.action as Action,
      reason: doc.reason,
      timestamp: doc.timestamp,
      log_message_id: doc.logMessageId
    };
  }

  public async updateCaseReason(guildId: string, caseNumber: number, newReason: string): Promise<boolean> {
    const res = await ModCaseModel.updateOne({ guildId, caseNumber }, { $set: { reason: newReason } });
    return res.modifiedCount > 0;
  }

  public async setCaseLogMessageId(caseId: any, messageId: string): Promise<void> {
    await ModCaseModel.findByIdAndUpdate(caseId, { logMessageId: messageId });
  }

  public async getUserCases(guildId: string, targetId: string, limit = 10): Promise<ModCase[]> {
    const docs = await ModCaseModel.find({ guildId, targetId })
      .sort({ caseNumber: -1 })
      .limit(limit);

    return docs.map(doc => ({
      id: doc._id.toString() as any,
      guild_id: doc.guildId,
      case_number: doc.caseNumber,
      target_id: doc.targetId,
      target_tag: doc.targetTag,
      moderator_id: doc.moderatorId,
      moderator_tag: doc.moderatorTag,
      action: doc.action as Action,
      reason: doc.reason,
      timestamp: doc.timestamp,
      log_message_id: doc.logMessageId
    }));
  }

  // --- Strikes ---
  public async getStrikes(guildId: string, userId: string): Promise<number> {
    const doc = await StrikeModel.findOne({ guildId, userId });
    return doc?.strikes || 0;
  }

  public async addStrikes(guildId: string, userId: string, count: number): Promise<number> {
    const current = await this.getStrikes(guildId, userId);
    const updated = Math.max(0, current + count);
    const now = Date.now();

    await StrikeModel.findOneAndUpdate(
      { guildId, userId },
      { $set: { strikes: updated, updatedAt: now } },
      { upsert: true }
    );

    return updated;
  }

  public async pardonStrikes(guildId: string, userId: string, count: number): Promise<number> {
    return this.addStrikes(guildId, userId, -count);
  }

  public async resetStrikes(guildId: string, userId: string): Promise<void> {
    await StrikeModel.deleteOne({ guildId, userId });
  }

  // --- Punishment Escalation Config ---
  public async getPunishments(guildId: string): Promise<PunishmentConfig[]> {
    const config = await this.getRawGuildConfig(guildId);
    return (config.punishments || []).map(p => ({
      guild_id: guildId,
      strike_count: p.strikeCount,
      action: p.action,
      duration_seconds: p.durationSeconds || 0
    }));
  }

  public async setPunishment(guildId: string, strikeCount: number, action: Action, durationSeconds = 0): Promise<void> {
    await GuildConfigModel.updateOne(
      { guildId },
      { $pull: { punishments: { strikeCount } } }
    );
    await GuildConfigModel.updateOne(
      { guildId },
      { $push: { punishments: { strikeCount, action, durationSeconds } } },
      { upsert: true }
    );
    this.invalidateCache(guildId);
  }

  public async removePunishment(guildId: string, strikeCount: number): Promise<boolean> {
    const res = await GuildConfigModel.updateOne(
      { guildId },
      { $pull: { punishments: { strikeCount } } }
    );
    this.invalidateCache(guildId);
    return (res.modifiedCount || 0) > 0;
  }

  public async getPunishmentForStrikes(guildId: string, strikeCount: number): Promise<PunishmentConfig | undefined> {
    const punishments = await this.getPunishments(guildId);
    return punishments.find(p => p.strike_count === strikeCount);
  }

  // --- Temp Punishments ---
  public async addTempPunishment(guildId: string, userId: string, action: Action, durationSeconds: number): Promise<TempPunishment> {
    const now = Date.now();
    const expiresAt = now + durationSeconds * 1000;

    const doc = await TempPunishmentModel.create({
      guildId,
      userId,
      action,
      expiresAt,
      createdAt: now
    });

    return {
      id: doc._id.toString() as any,
      guild_id: guildId,
      user_id: userId,
      action,
      expires_at: expiresAt,
      created_at: now
    };
  }

  public async getExpiredPunishments(now = Date.now()): Promise<TempPunishment[]> {
    const docs = await TempPunishmentModel.find({ expiresAt: { $lte: now } });
    return docs.map(doc => ({
      id: doc._id.toString() as any,
      guild_id: doc.guildId,
      user_id: doc.userId,
      action: doc.action as Action,
      expires_at: doc.expiresAt,
      created_at: doc.createdAt
    }));
  }

  public async removeTempPunishment(id: any): Promise<void> {
    await TempPunishmentModel.findByIdAndDelete(id);
  }

  public async removeUserTempPunishments(guildId: string, userId: string, action?: Action): Promise<void> {
    const query: any = { guildId, userId };
    if (action) query.action = action;
    await TempPunishmentModel.deleteMany(query);
  }

  // --- Ignores ---
  public async addIgnore(guildId: string, entityId: string, type: 'channel' | 'role' | 'user'): Promise<void> {
    await GuildConfigModel.updateOne(
      { guildId },
      { $addToSet: { ignores: { entityId, type } } },
      { upsert: true }
    );
    this.invalidateCache(guildId);
  }

  public async removeIgnore(guildId: string, entityId: string): Promise<boolean> {
    const res = await GuildConfigModel.updateOne(
      { guildId },
      { $pull: { ignores: { entityId } } }
    );
    this.invalidateCache(guildId);
    return (res.modifiedCount || 0) > 0;
  }

  public async isIgnored(guildId: string, entityIds: string[]): Promise<boolean> {
    const config = await this.getRawGuildConfig(guildId);
    const ignoreSet = new Set(config.ignores.map(i => i.entityId));
    return entityIds.some(id => ignoreSet.has(id));
  }

  public async getIgnores(guildId: string): Promise<{ entity_id: string; type: string }[]> {
    const config = await this.getRawGuildConfig(guildId);
    return config.ignores.map(i => ({ entity_id: i.entityId, type: i.type }));
  }

  // --- Invite Whitelist ---
  public async addInviteWhitelist(guildId: string, target: string): Promise<void> {
    await GuildConfigModel.updateOne(
      { guildId },
      { $addToSet: { inviteWhitelist: target.toLowerCase() } },
      { upsert: true }
    );
    this.invalidateCache(guildId);
  }

  public async removeInviteWhitelist(guildId: string, target: string): Promise<boolean> {
    const res = await GuildConfigModel.updateOne(
      { guildId },
      { $pull: { inviteWhitelist: target.toLowerCase() } }
    );
    this.invalidateCache(guildId);
    return (res.modifiedCount || 0) > 0;
  }

  public async isInviteWhitelisted(guildId: string, target: string): Promise<boolean> {
    const config = await this.getRawGuildConfig(guildId);
    const list = config.inviteWhitelist || [];
    return list.includes(target.toLowerCase());
  }

  public async getInviteWhitelist(guildId: string): Promise<string[]> {
    const config = await this.getRawGuildConfig(guildId);
    return config.inviteWhitelist || [];
  }

  // --- Word / Regex Filters ---
  public async getFilters(guildId: string): Promise<FilterItem[]> {
    const config = await this.getRawGuildConfig(guildId);
    return (config.filters || []).map(f => ({
      id: f.id,
      guild_id: guildId,
      pattern: f.pattern,
      is_regex: f.isRegex ? 1 : 0,
      strikes: f.strikes
    }));
  }

  public async addFilter(guildId: string, pattern: string, isRegex: boolean, strikes = 1): Promise<number> {
    const config = await this.getRawGuildConfig(guildId);
    const newId = (config.filters.length > 0 ? Math.max(...config.filters.map(f => f.id)) : 0) + 1;

    await GuildConfigModel.updateOne(
      { guildId },
      { $push: { filters: { id: newId, pattern, isRegex, strikes } } },
      { upsert: true }
    );
    this.invalidateCache(guildId);
    return newId;
  }

  public async removeFilter(guildId: string, idOrPattern: string): Promise<boolean> {
    const isNum = !isNaN(Number(idOrPattern));
    const filterQuery = isNum ? { id: Number(idOrPattern) } : { pattern: idOrPattern };

    const res = await GuildConfigModel.updateOne(
      { guildId },
      { $pull: { filters: filterQuery } }
    );
    this.invalidateCache(guildId);
    return (res.modifiedCount || 0) > 0;
  }
}
