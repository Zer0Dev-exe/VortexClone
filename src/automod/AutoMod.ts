import {
  Client,
  GuildMember,
  Message,
  PermissionFlagsBits,
  TextChannel
} from 'discord.js';
import { Database } from '../database/Database.js';
import { ModLogger } from '../logging/ModLogger.js';
import { AntiInvite } from './AntiInvite.js';
import { AntiDuplicate } from './AntiDuplicate.js';
import { AntiCopypasta } from './AntiCopypasta.js';
import { AntiReferral } from './AntiReferral.js';
import { StrikeHandler } from './StrikeHandler.js';

export class AutoMod {
  private client: Client;
  private db: Database;
  private strikeHandler: StrikeHandler;
  private antiDupe: AntiDuplicate;

  constructor(client: Client, db: Database, modLogger: ModLogger) {
    this.client = client;
    this.db = db;
    this.strikeHandler = new StrikeHandler(db, modLogger);
    this.antiDupe = new AntiDuplicate(15000);
  }

  public getStrikeHandler(): StrikeHandler {
    return this.strikeHandler;
  }

  public async shouldPerformAutomod(member: GuildMember | null, channelId?: string): Promise<boolean> {
    if (!member || member.user.bot) return false;

    // Check permissions (inmunity if staff)
    if (
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      member.permissions.has(PermissionFlagsBits.BanMembers) ||
      member.permissions.has(PermissionFlagsBits.KickMembers)
    ) {
      return false;
    }

    // Check ignores (channel, user, or any of member's roles)
    const entityIdsToCheck = [member.id, ...member.roles.cache.map(r => r.id)];
    if (channelId) entityIdsToCheck.push(channelId);

    if (await this.db.isIgnored(member.guild.id, entityIdsToCheck)) {
      return false;
    }

    return true;
  }

  public async performAutomod(message: Message): Promise<boolean> {
    if (!message.guild || !message.member) return false;
    if (!(await this.shouldPerformAutomod(message.member, message.channel.id))) return false;

    const guildId = message.guild.id;
    const settings = await this.db.getAutomodSettings(guildId);
    const content = message.content || '';

    let shouldDelete = false;
    let warningText: string | null = null;
    let strikeTotal = 0;
    const reasons: string[] = [];

    // 1. Anti-Invite
    if (settings.anti_invite > 0 && AntiInvite.hasInvite(content)) {
      const isForeign = await AntiInvite.isForeignInvite(this.client, this.db, guildId, content);
      if (isForeign) {
        shouldDelete = true;
        warningText = 'No se permiten enlaces de invitación de Discord.';
        reasons.push('Invitación no autorizada');
        strikeTotal += settings.anti_invite;
      }
    }

    // 2. Anti-Everyone / Anti-Here
    if (settings.anti_everyone > 0 && (content.includes('@everyone') || content.includes('@here'))) {
      if (!message.member.permissions.has(PermissionFlagsBits.MentionEveryone)) {
        shouldDelete = true;
        warningText = 'No tienes permiso para mencionar a todos.';
        reasons.push('Mención no autorizada de @everyone/@here');
        strikeTotal += settings.anti_everyone;
      }
    }

    // 3. Anti-Referral
    if (settings.anti_referral > 0 && AntiReferral.isReferralOrScam(content)) {
      shouldDelete = true;
      warningText = 'No se permiten enlaces de referidos o dudosos.';
      reasons.push('Enlace de referido o sospechoso');
      strikeTotal += settings.anti_referral;
    }

    // 4. Anti-Duplicate
    if (settings.anti_duplicate > 0) {
      const dupeCount = this.antiDupe.check(guildId, message.author.id, content);
      if (dupeCount >= settings.dupe_strike_thresh) {
        shouldDelete = true;
        reasons.push('Spam de mensajes duplicados');
        strikeTotal += settings.anti_duplicate;
        warningText = 'Por favor, deja de spamear el mismo mensaje.';
      } else if (dupeCount >= settings.dupe_delete_thresh) {
        shouldDelete = true;
        warningText = 'Por favor, deja de repetir mensajes.';
      }
    }

    // 5. Anti-Copypasta
    if (settings.anti_copypasta > 0 && AntiCopypasta.isCopypasta(content)) {
      shouldDelete = true;
      reasons.push('Texto copypasta o repetición masiva');
      strikeTotal += settings.anti_copypasta;
      warningText = 'No se permite texto repetitivo o copypasta.';
    }

    // 6. Max Lines
    if (settings.max_lines > 0) {
      const lineCount = (content.match(/\n/g) || []).length + 1;
      if (lineCount > settings.max_lines) {
        shouldDelete = true;
        reasons.push(`Límite de líneas excedido (${lineCount}/${settings.max_lines})`);
        strikeTotal += 1;
        warningText = `Tu mensaje excede el límite de ${settings.max_lines} líneas.`;
      }
    }

    // 7. Max Mentions
    if (settings.max_mentions > 0) {
      const mentionCount = message.mentions.users.size + message.mentions.roles.size;
      if (mentionCount > settings.max_mentions) {
        shouldDelete = true;
        reasons.push(`Límite de menciones excedido (${mentionCount}/${settings.max_mentions})`);
        strikeTotal += 1;
        warningText = `Tu mensaje contiene demasiadas menciones (${mentionCount}/${settings.max_mentions}).`;
      }
    }

    // 8. Word / Regex Filters
    const filters = await this.db.getFilters(guildId);
    for (const filter of filters) {
      let matched = false;
      if (filter.is_regex) {
        try {
          const re = new RegExp(filter.pattern, 'i');
          if (re.test(content)) matched = true;
        } catch {}
      } else {
        if (content.toLowerCase().includes(filter.pattern.toLowerCase())) {
          matched = true;
        }
      }

      if (matched) {
        shouldDelete = true;
        reasons.push(`Filtro de palabras: "${filter.pattern}"`);
        strikeTotal += filter.strikes || 1;
        warningText = 'Tu mensaje contenía palabras prohibidas.';
        break;
      }
    }

    // --- Action Execution ---
    if (shouldDelete && message.deletable) {
      try {
        await message.delete();
      } catch (err) {
        console.warn('[AutoMod] Error al eliminar mensaje:', err);
      }
    }

    // Temporary warning message (self-deletes after 2500ms like Vortex)
    if (warningText && message.channel instanceof TextChannel) {
      try {
        const warnMsg = await message.channel.send(`⚠️ <@${message.author.id}>, ${warningText}`);
        setTimeout(() => {
          warnMsg.delete().catch(() => {});
        }, 2500);
      } catch {}
    }

    // Apply strikes if applicable
    if (strikeTotal > 0) {
      const reasonStr = reasons.join(', ');
      await this.strikeHandler.applyStrikes(
        message.guild,
        message.author,
        message.guild.members.me?.user || message.author,
        strikeTotal,
        reasonStr
      );
      return true;
    }

    return shouldDelete;
  }
}
