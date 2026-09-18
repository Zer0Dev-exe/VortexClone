import { Client, EmbedBuilder, TextChannel, User, GuildMember } from 'discord.js';
import { Database } from '../database/Database.js';
import { Action, ActionMeta, ModCase } from '../types/index.js';

export class ModLogger {
  private client: Client;
  private db: Database;

  constructor(client: Client, db: Database) {
    this.client = client;
    this.db = db;
  }

  public async postCase(
    guildId: string,
    target: User | { id: string; tag: string },
    moderator: User | GuildMember | { id: string; tag: string },
    action: Action,
    reason: string
  ): Promise<ModCase> {
    const targetTag = (target as any).tag || `${target.id}`;
    const modTag = (moderator as any).tag || (moderator as any).user?.tag || `${(moderator as any).id}`;
    const modId = (moderator as any).id || (moderator as any).user?.id;

    // 1. Create case in database
    const modCase = await this.db.createCase(
      guildId,
      target.id,
      targetTag,
      modId,
      modTag,
      action,
      reason
    );

    // 2. Dispatch to modlog channel if configured
    const settings = await this.db.getGuildSettings(guildId);
    if (!settings.modlog_channel_id) return modCase;

    try {
      const channel = await this.client.channels.fetch(settings.modlog_channel_id);
      if (!channel || !(channel instanceof TextChannel)) return modCase;

      const meta = ActionMeta[action] || ActionMeta[Action.NONE];
      const embed = new EmbedBuilder()
        .setColor(meta.color)
        .setTitle(`${meta.emoji} [Caso #${modCase.case_number}] ${action} | ${targetTag}`)
        .addFields(
          { name: '👤 Usuario', value: `<@${target.id}> (${target.id})`, inline: true },
          { name: '🛡️ Moderador', value: `<@${modId}> (${modTag})`, inline: true },
          { name: '📄 Motivo', value: reason || 'Sin motivo especificado' }
        )
        .setTimestamp(modCase.timestamp)
        .setFooter({ text: `ID de Caso: ${modCase.case_number}` });

      const msg = await channel.send({ embeds: [embed] });
      await this.db.setCaseLogMessageId(modCase.id, msg.id);
    } catch (err) {
      console.error(`[ModLogger] Error enviando caso #${modCase.case_number} al canal de modlog:`, err);
    }

    return modCase;
  }

  public async updateCaseReason(guildId: string, caseNumber: number, newReason: string): Promise<boolean> {
    const modCase = await this.db.getCase(guildId, caseNumber);
    if (!modCase) return false;

    const updated = await this.db.updateCaseReason(guildId, caseNumber, newReason);
    if (!updated) return false;

    const settings = await this.db.getGuildSettings(guildId);
    if (!settings.modlog_channel_id || !modCase.log_message_id) return true;

    try {
      const channel = await this.client.channels.fetch(settings.modlog_channel_id);
      if (!channel || !(channel instanceof TextChannel)) return true;

      const message = await channel.messages.fetch(modCase.log_message_id);
      if (!message || message.embeds.length === 0) return true;

      const oldEmbed = message.embeds[0];
      const meta = ActionMeta[modCase.action] || ActionMeta[Action.NONE];
      const newEmbed = EmbedBuilder.from(oldEmbed)
        .setFields(
          { name: '👤 Usuario', value: `<@${modCase.target_id}> (${modCase.target_id})`, inline: true },
          { name: '🛡️ Moderador', value: `<@${modCase.moderator_id}> (${modCase.moderator_tag})`, inline: true },
          { name: '📄 Motivo', value: newReason }
        );

      await message.edit({ embeds: [newEmbed] });
    } catch (err) {
      console.warn(`[ModLogger] No se pudo editar el mensaje de log para el caso #${caseNumber}:`, err);
    }

    return true;
  }
}
