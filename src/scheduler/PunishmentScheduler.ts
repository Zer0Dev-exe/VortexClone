import { Client, PermissionFlagsBits } from 'discord.js';
import { Database } from '../database/Database.js';
import { ModLogger } from '../logging/ModLogger.js';
import { Action } from '../types/index.js';

export class PunishmentScheduler {
  private client: Client;
  private db: Database;
  private modLogger: ModLogger;
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;

  constructor(client: Client, db: Database, modLogger: ModLogger, intervalMs = 15000) {
    this.client = client;
    this.db = db;
    this.modLogger = modLogger;
    this.intervalMs = intervalMs;
  }

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.checkExpiredPunishments().catch(err => {
        console.error('[PunishmentScheduler] Error en ciclo de verificación:', err);
      });
    }, this.intervalMs);
    console.log('[PunishmentScheduler] Programador de sanciones temporales iniciado.');
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async checkExpiredPunishments(): Promise<void> {
    const now = Date.now();
    const expired = await this.db.getExpiredPunishments(now);
    if (expired.length === 0) return;

    for (const record of expired) {
      try {
        const guild = await this.client.guilds.fetch(record.guild_id);
        if (!guild) {
          await this.db.removeTempPunishment(record.id);
          continue;
        }

        const me = guild.members.me;

        if (record.action === Action.TEMPBAN) {
          if (me?.permissions.has(PermissionFlagsBits.BanMembers)) {
            try {
              await guild.bans.remove(record.user_id, 'Vortex: Fin de baneo temporal');
              await this.modLogger.postCase(
                guild.id,
                { id: record.user_id, tag: `User#${record.user_id}` },
                me.user,
                Action.UNBAN,
                'Baneo temporal completado automáticamente'
              );
            } catch (err) {
              console.warn(`[PunishmentScheduler] No se pudo desbanear al usuario ${record.user_id}:`, err);
            }
          }
        } else if (record.action === Action.TEMPMUTE) {
          try {
            const member = await guild.members.fetch(record.user_id);
            if (member) {
              // Lift timeout if active
              if (member.isCommunicationDisabled()) {
                await member.timeout(null, 'Vortex: Fin de silencio temporal');
              }
              // Lift Muted role if present
              const settings = await this.db.getGuildSettings(guild.id);
              if (settings.mute_role_id && member.roles.cache.has(settings.mute_role_id)) {
                await member.roles.remove(settings.mute_role_id, 'Vortex: Fin de silencio temporal');
              }

              await this.modLogger.postCase(
                guild.id,
                member.user,
                me?.user || { id: '0', tag: 'Vortex System' },
                Action.UNMUTE,
                'Silencio temporal completado automáticamente'
              );
            }
          } catch (err) {
            console.warn(`[PunishmentScheduler] Error quitando mute a ${record.user_id}:`, err);
          }
        }
      } catch (err) {
        console.warn(`[PunishmentScheduler] Error procesando sanción vencida ${record.id}:`, err);
      } finally {
        await this.db.removeTempPunishment(record.id);
      }
    }
  }
}
