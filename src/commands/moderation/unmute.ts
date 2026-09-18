import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command, Action } from '../../types/index.js';
import { Database } from '../../database/Database.js';
import { ModLogger } from '../../logging/ModLogger.js';

export function createUnmuteCommand(db: Database, modLogger: ModLogger): Command {
  const slashData = new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Quita el silencio a un miembro.')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a des-silenciar').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

  return {
    name: 'unmute',
    description: 'Quita el silencio a un miembro.',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const targetUser = interaction.options.getUser('usuario', true);
      const reason = interaction.options.getString('motivo') || 'Des-silencio manual';
      const guild = interaction.guild!;

      try {
        const member = await guild.members.fetch(targetUser.id);
        if (member.isCommunicationDisabled()) {
          await member.timeout(null, reason);
        }

        const settings = await db.getGuildSettings(guild.id);
        if (settings.mute_role_id && member.roles.cache.has(settings.mute_role_id)) {
          await member.roles.remove(settings.mute_role_id, reason);
        }

        await db.removeUserTempPunishments(guild.id, targetUser.id, Action.TEMPMUTE);
        await modLogger.postCase(guild.id, targetUser, interaction.user, Action.UNMUTE, reason);

        await interaction.reply({ content: `🔊 **${targetUser.tag}** ya no está silenciado.` });
      } catch (err: any) {
        await interaction.reply({ content: `❌ Error al des-silenciar: ${err.message}`, ephemeral: true });
      }
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0]) {
        await message.reply('Uso: `>>unmute <@usuario|id> [motivo]`');
        return;
      }
      const mention = message.mentions.users.first();
      const userId = mention ? mention.id : args[0].replace(/[<@!>]/g, '');
      const reason = args.slice(1).join(' ') || 'Des-silencio manual';
      const guild = message.guild!;

      try {
        const member = await guild.members.fetch(userId);
        if (member.isCommunicationDisabled()) {
          await member.timeout(null, reason);
        }

        const settings = await db.getGuildSettings(guild.id);
        if (settings.mute_role_id && member.roles.cache.has(settings.mute_role_id)) {
          await member.roles.remove(settings.mute_role_id, reason);
        }

        await db.removeUserTempPunishments(guild.id, member.id, Action.TEMPMUTE);
        await modLogger.postCase(guild.id, member.user, message.author, Action.UNMUTE, reason);

        await message.reply(`🔊 **${member.user.tag}** ya no está silenciado.`);
      } catch (err: any) {
        await message.reply(`❌ Error: ${err.message}`);
      }
    }
  };
}
