import {
  Client,
  EmbedBuilder,
  GuildMember,
  Message,
  PartialGuildMember,
  TextChannel,
  User,
  VoiceState
} from 'discord.js';
import { Database } from '../database/Database.js';
import { CachedMessage } from './MessageCache.js';

export class GuildLogger {
  private client: Client;
  private db: Database;

  constructor(client: Client, db: Database) {
    this.client = client;
    this.db = db;
  }

  // --- Message Logs ---
  public async logMessageDelete(cached: CachedMessage, channelName: string): Promise<void> {
    const settings = await this.db.getGuildSettings(cached.guildId);
    if (!settings.messagelog_channel_id) return;

    try {
      const channel = await this.client.channels.fetch(settings.messagelog_channel_id);
      if (!channel || !(channel instanceof TextChannel)) return;

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({ name: `${cached.authorTag} (${cached.authorId})` })
        .setTitle('🗑️ Mensaje eliminado')
        .setDescription(cached.content ? cached.content.slice(0, 2000) : '*[Sin contenido de texto]*')
        .addFields(
          { name: 'Canal', value: `#${channelName} (<#${cached.channelId}>)`, inline: true },
          { name: 'ID Mensaje', value: cached.id, inline: true }
        )
        .setTimestamp();

      if (cached.attachments.length > 0) {
        embed.addFields({ name: 'Archivos adjuntos', value: cached.attachments.slice(0, 5).join('\n') });
      }

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.warn('[GuildLogger] Error registrando mensaje eliminado:', err);
    }
  }

  public async logMessageEdit(oldMessage: CachedMessage, newMessage: Message): Promise<void> {
    if (!newMessage.guild || oldMessage.content === newMessage.content) return;

    const settings = await this.db.getGuildSettings(newMessage.guild.id);
    if (!settings.messagelog_channel_id) return;

    try {
      const channel = await this.client.channels.fetch(settings.messagelog_channel_id);
      if (!channel || !(channel instanceof TextChannel)) return;

      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setAuthor({ name: `${newMessage.author.tag} (${newMessage.author.id})`, iconURL: newMessage.author.displayAvatarURL() })
        .setTitle('✏️ Mensaje editado')
        .addFields(
          { name: 'Antes', value: oldMessage.content ? oldMessage.content.slice(0, 1000) : '*[Vacío]*' },
          { name: 'Después', value: newMessage.content ? newMessage.content.slice(0, 1000) : '*[Vacío]*' },
          { name: 'Canal', value: `<#${newMessage.channel.id}>`, inline: true },
          { name: 'Salto al mensaje', value: `[Ir al mensaje](${newMessage.url})`, inline: true }
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.warn('[GuildLogger] Error registrando mensaje editado:', err);
    }
  }

  // --- Server Logs ---
  public async logMemberJoin(member: GuildMember): Promise<void> {
    const settings = await this.db.getGuildSettings(member.guild.id);
    if (!settings.serverlog_channel_id) return;

    try {
      const channel = await this.client.channels.fetch(settings.serverlog_channel_id);
      if (!channel || !(channel instanceof TextChannel)) return;

      const accountCreated = Math.floor(member.user.createdTimestamp / 1000);
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setAuthor({ name: `${member.user.tag} (${member.id})`, iconURL: member.user.displayAvatarURL() })
        .setTitle('📥 Miembro se ha unido')
        .addFields(
          { name: 'Cuenta creada', value: `<t:${accountCreated}:F> (<t:${accountCreated}:R>)` },
          { name: 'Total de miembros', value: `${member.guild.memberCount}` }
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.warn('[GuildLogger] Error registrando entrada de miembro:', err);
    }
  }

  public async logMemberLeave(member: GuildMember | PartialGuildMember): Promise<void> {
    const settings = await this.db.getGuildSettings(member.guild.id);
    if (!settings.serverlog_channel_id) return;

    try {
      const channel = await this.client.channels.fetch(settings.serverlog_channel_id);
      if (!channel || !(channel instanceof TextChannel)) return;

      const joinedAt = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
      const embed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setAuthor({ name: `${member.user?.tag || member.id}`, iconURL: member.user?.displayAvatarURL() })
        .setTitle('📤 Miembro se ha marchado')
        .addFields(
          { name: 'Se unió', value: joinedAt ? `<t:${joinedAt}:R>` : 'Desconocido' },
          { name: 'Total de miembros', value: `${member.guild.memberCount}` }
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.warn('[GuildLogger] Error registrando salida de miembro:', err);
    }
  }

  // --- Voice Logs ---
  public async logVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const guild = newState.guild || oldState.guild;
    const settings = await this.db.getGuildSettings(guild.id);
    if (!settings.voicelog_channel_id) return;

    try {
      const channel = await this.client.channels.fetch(settings.voicelog_channel_id);
      if (!channel || !(channel instanceof TextChannel)) return;

      const member = newState.member || oldState.member;
      if (!member) return;

      let title = '';
      let color = 0x3498db;
      let desc = '';

      if (!oldState.channelId && newState.channelId) {
        title = '🔊 Conectado a canal de voz';
        color = 0x2ecc71;
        desc = `<@${member.id}> (${member.user.tag}) se conectó a **${newState.channel?.name}**`;
      } else if (oldState.channelId && !newState.channelId) {
        title = '🔇 Desconectado de canal de voz';
        color = 0xe74c3c;
        desc = `<@${member.id}> (${member.user.tag}) abandonó **${oldState.channel?.name}**`;
      } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        title = '🔀 Cambio de canal de voz';
        color = 0xf39c12;
        desc = `<@${member.id}> (${member.user.tag}) se movió de **${oldState.channel?.name}** a **${newState.channel?.name}**`;
      } else {
        return; // No canal change (mute/deafen etc.)
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(desc)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.warn('[GuildLogger] Error registrando evento de voz:', err);
    }
  }
}
