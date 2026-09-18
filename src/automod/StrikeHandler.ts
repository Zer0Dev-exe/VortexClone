import { Guild, GuildMember, PermissionFlagsBits, User } from 'discord.js';
import { Database } from '../database/Database.js';
import { ModLogger } from '../logging/ModLogger.js';
import { Action, PunishmentConfig } from '../types/index.js';

export class StrikeHandler {
  private db: Database;
  private modLogger: ModLogger;

  constructor(db: Database, modLogger: ModLogger) {
    this.db = db;
    this.modLogger = modLogger;
  }

  public async applyStrikes(
    guild: Guild,
    targetUser: User,
    moderator: User | GuildMember,
    strikesToAdd: number,
    reason: string
  ): Promise<{ newStrikes: number; punishmentExecuted?: Action }> {
    // 1. Add strikes
    const newStrikes = await this.db.addStrikes(guild.id, targetUser.id, strikesToAdd);

    // 2. Post strike case to modlog
    await this.modLogger.postCase(
      guild.id,
      targetUser,
      moderator,
      Action.STRIKE,
      `[+${strikesToAdd} Strike(s) | Total: ${newStrikes}] ${reason}`
    );

    // 3. Check punishment escalation table
    const punishment = await this.db.getPunishmentForStrikes(guild.id, newStrikes);
    if (!punishment || punishment.action === Action.NONE) {
      return { newStrikes };
    }

    // 4. Execute escalating punishment
    let member: GuildMember | null = null;
    try {
      member = await guild.members.fetch(targetUser.id);
    } catch {
      // Member might not be in guild anymore
    }

    const executed = await this.executePunishment(guild, targetUser, member, moderator, punishment, reason, newStrikes);
    return { newStrikes, punishmentExecuted: executed };
  }

  private async executePunishment(
    guild: Guild,
    targetUser: User,
    member: GuildMember | null,
    moderator: User | GuildMember,
    punishment: PunishmentConfig,
    baseReason: string,
    strikeCount: number
  ): Promise<Action> {
    const fullReason = `Escalado automático por ${strikeCount} strikes: ${baseReason}`;
    const me = guild.members.me;

    switch (punishment.action) {
      case Action.WARN: {
        if (member) {
          try {
            await member.send(`⚠️ Has recibido una advertencia formal en **${guild.name}**. Motivo: ${fullReason}`);
          } catch {}
        }
        await this.modLogger.postCase(guild.id, targetUser, moderator, Action.WARN, fullReason);
        return Action.WARN;
      }

      case Action.TEMPMUTE:
      case Action.MUTE: {
        const durationSec = punishment.duration_seconds || 3600; // default 1h if 0
        const durationMs = durationSec * 1000;

        if (member && member.moderatable && me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          // Native Discord Timeout (max 28 days = 2419200 sec)
          if (durationSec <= 2419200) {
            await member.timeout(durationMs, fullReason);
          } else {
            // Fallback to Muted role if longer than 28 days
            await this.applyMuteRole(guild, member, fullReason);
          }
        } else if (member) {
          await this.applyMuteRole(guild, member, fullReason);
        }

        if (punishment.action === Action.TEMPMUTE) {
          await this.db.addTempPunishment(guild.id, targetUser.id, Action.TEMPMUTE, durationSec);
        }

        await this.modLogger.postCase(
          guild.id,
          targetUser,
          moderator,
          punishment.action,
          `${fullReason} (Duración: ${durationSec}s)`
        );
        return punishment.action;
      }

      case Action.KICK: {
        if (member && member.kickable && me?.permissions.has(PermissionFlagsBits.KickMembers)) {
          try {
            await member.send(`👢 Has sido expulsado de **${guild.name}**. Motivo: ${fullReason}`);
          } catch {}
          await member.kick(fullReason);
          await this.modLogger.postCase(guild.id, targetUser, moderator, Action.KICK, fullReason);
          return Action.KICK;
        }
        break;
      }

      case Action.SOFTBAN: {
        if (me?.permissions.has(PermissionFlagsBits.BanMembers)) {
          try {
            await targetUser.send(`🍌 Has recibido softban en **${guild.name}**. Motivo: ${fullReason}`);
          } catch {}
          await guild.bans.create(targetUser.id, { deleteMessageSeconds: 86400, reason: fullReason });
          await guild.bans.remove(targetUser.id, 'Softban desbaneo inmediato');
          await this.modLogger.postCase(guild.id, targetUser, moderator, Action.SOFTBAN, fullReason);
          return Action.SOFTBAN;
        }
        break;
      }

      case Action.TEMPBAN:
      case Action.BAN: {
        if (me?.permissions.has(PermissionFlagsBits.BanMembers)) {
          try {
            await targetUser.send(`🔨 Has sido baneado de **${guild.name}**. Motivo: ${fullReason}`);
          } catch {}
          await guild.bans.create(targetUser.id, { deleteMessageSeconds: 86400, reason: fullReason });

          if (punishment.action === Action.TEMPBAN && punishment.duration_seconds > 0) {
            await this.db.addTempPunishment(guild.id, targetUser.id, Action.TEMPBAN, punishment.duration_seconds);
          }

          await this.modLogger.postCase(
            guild.id,
            targetUser,
            moderator,
            punishment.action,
            `${fullReason}${punishment.duration_seconds > 0 ? ` (Duración: ${punishment.duration_seconds}s)` : ''}`
          );
          return punishment.action;
        }
        break;
      }
    }

    return Action.NONE;
  }

  private async applyMuteRole(guild: Guild, member: GuildMember, reason: string): Promise<void> {
    const settings = await this.db.getGuildSettings(guild.id);
    if (!settings.mute_role_id) return;
    const role = guild.roles.cache.get(settings.mute_role_id);
    if (role && guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await member.roles.add(role, reason);
    }
  }
}
