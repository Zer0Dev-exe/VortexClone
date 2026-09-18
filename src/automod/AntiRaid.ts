import { GuildMember, GuildVerificationLevel, PermissionFlagsBits } from 'discord.js';
import { Database } from '../database/Database.js';
import { ModLogger } from '../logging/ModLogger.js';
import { Action } from '../types/index.js';

export class AntiRaid {
  private db: Database;
  private modLogger: ModLogger;
  // Key: guildId -> array of timestamps
  private joinTimestamps: Map<string, number[]> = new Map();

  constructor(db: Database, modLogger: ModLogger) {
    this.db = db;
    this.modLogger = modLogger;
  }

  public async onMemberJoin(member: GuildMember): Promise<boolean> {
    if (member.user.bot) return false;

    const guild = member.guild;
    const settings = await this.db.getGuildSettings(guild.id);
    const am = await this.db.getAutomodSettings(guild.id);

    const now = Date.now();
    const timestamps = this.joinTimestamps.get(guild.id) || [];
    const windowMs = (am.auto_raid_mode_time || 10) * 1000;

    // Filter joins inside current window
    const recentJoins = timestamps.filter(t => now - t <= windowMs);
    recentJoins.push(now);
    this.joinTimestamps.set(guild.id, recentJoins);

    let inRaidMode = settings.raid_mode === 1;

    // Trigger auto raidmode if threshold reached
    if (!inRaidMode && am.auto_raid_mode_number > 0 && recentJoins.length >= am.auto_raid_mode_number) {
      inRaidMode = true;
      await this.db.updateGuildSettings(guild.id, { raid_mode: 1 });

      // Raise verification level if bot has permission
      if (guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        try {
          if (guild.verificationLevel < GuildVerificationLevel.High) {
            await guild.setVerificationLevel(GuildVerificationLevel.High, 'Vortex AutoMod: Raid Mode activado automáticamente');
          }
        } catch (err) {
          console.warn('[AntiRaid] Error subiendo verificación de servidor:', err);
        }
      }

      await this.modLogger.postCase(
        guild.id,
        member.user,
        guild.members.me?.user || { id: '0', tag: 'Vortex Anti-Raid' },
        Action.RAIDMODE,
        `Tasa de entrada excedida: ${recentJoins.length} miembros en ${am.auto_raid_mode_time}s`
      );
    }

    // If currently in raid mode, kick incoming unverified members
    if (inRaidMode) {
      if (member.kickable) {
        try {
          await member.send(`Lo sentimos, el servidor **${guild.name}** se encuentra actualmente bajo protección de Anti-Raid / Lockdown. Por favor intenta unirte más tarde.`);
        } catch {
          // DMs might be closed
        }
        try {
          await member.kick('Vortex AutoMod: Modo Anti-Raid activo');
          return true;
        } catch (err) {
          console.warn(`[AntiRaid] Error expulsando a ${member.user.tag}:`, err);
        }
      }
    }

    return false;
  }

  public async disableRaidMode(guildId: string): Promise<void> {
    await this.db.updateGuildSettings(guildId, { raid_mode: 0 });
    this.joinTimestamps.delete(guildId);
  }
}
