import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command, Action } from '../../types/index.js';
import { Database } from '../../database/Database.js';
import { ModLogger } from '../../logging/ModLogger.js';
import { parseDurationToSeconds } from '../../utils/time.js';

export function createMuteCommand(db: Database, modLogger: ModLogger): Command {
  const slashData = new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Silencia a un miembro (timeout o rol Muted).')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a silenciar').setRequired(true))
    .addStringOption(opt => opt.setName('tiempo').setDescription('Duración del silencio (ej. 10m, 1h, 1d)').setRequired(false))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

  return {
    name: 'mute',
    description: 'Silencia a un miembro.',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const targetUser = interaction.options.getUser('usuario', true);
      const timeStr = interaction.options.getString('tiempo');
      const reason = interaction.options.getString('motivo') || 'Sin motivo especificado';
      const durationSeconds = timeStr ? parseDurationToSeconds(timeStr) : 3600; // default 1 hour if unspecified

      const guild = interaction.guild!;
      try {
        const member = await guild.members.fetch(targetUser.id);
        if (!member.moderatable) {
          await interaction.reply({ content: '❌ No puedo silenciar a este miembro (jerarquía de roles superior o igual).', ephemeral: true });
          return;
        }

        // Apply native timeout if <= 28 days
        if (durationSeconds && durationSeconds <= 2419200) {
          await member.timeout(durationSeconds * 1000, reason);
        }

        // Apply Muted role if configured
        const settings = await db.getGuildSettings(guild.id);
        if (settings.mute_role_id) {
          const role = guild.roles.cache.get(settings.mute_role_id);
          if (role) await member.roles.add(role, reason);
        }

        if (durationSeconds) {
          await db.addTempPunishment(guild.id, targetUser.id, Action.TEMPMUTE, durationSeconds);
        }

        await modLogger.postCase(
          guild.id,
          targetUser,
          interaction.user,
          Action.TEMPMUTE,
          `${reason} (Duración: ${timeStr || '1h'})`
        );

        await interaction.reply({ content: `🔇 **${targetUser.tag}** ha sido silenciado por **${timeStr || '1h'}**.` });
      } catch (err: any) {
        await interaction.reply({ content: `❌ Error al silenciar: ${err.message}`, ephemeral: true });
      }
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0]) {
        await message.reply('Uso: `>>mute <@usuario|id> [tiempo] [motivo]`');
        return;
      }
      const mention = message.mentions.users.first();
      const userId = mention ? mention.id : args[0].replace(/[<@!>]/g, '');

      let remainingArgs = args.slice(1);
      let durationSeconds: number | null = null;
      let timeStr: string | null = null;

      if (remainingArgs.length > 0) {
        const parsed = parseDurationToSeconds(remainingArgs[0]);
        if (parsed !== null) {
          durationSeconds = parsed;
          timeStr = remainingArgs[0];
          remainingArgs = remainingArgs.slice(1);
        }
      }

      const finalDuration = durationSeconds || 3600;
      const reason = remainingArgs.join(' ') || 'Sin motivo especificado';
      const guild = message.guild!;

      try {
        const member = await guild.members.fetch(userId);
        if (!member.moderatable) {
          await message.reply('❌ No puedo silenciar a este miembro.');
          return;
        }

        if (finalDuration <= 2419200) {
          await member.timeout(finalDuration * 1000, reason);
        }

        const settings = await db.getGuildSettings(guild.id);
        if (settings.mute_role_id) {
          const role = guild.roles.cache.get(settings.mute_role_id);
          if (role) await member.roles.add(role, reason);
        }

        await db.addTempPunishment(guild.id, member.id, Action.TEMPMUTE, finalDuration);
        await modLogger.postCase(
          guild.id,
          member.user,
          message.author,
          Action.TEMPMUTE,
          `${reason} (Duración: ${timeStr || '1h'})`
        );

        await message.reply(`🔇 **${member.user.tag}** ha sido silenciado.`);
      } catch (err: any) {
        await message.reply(`❌ Error: ${err.message}`);
      }
    }
  };
}
