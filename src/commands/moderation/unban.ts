import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command, Action } from '../../types/index.js';
import { Database } from '../../database/Database.js';
import { ModLogger } from '../../logging/ModLogger.js';

export function createUnbanCommand(db: Database, modLogger: ModLogger): Command {
  const slashData = new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Desbanea a un usuario del servidor por su ID.')
    .addStringOption(opt => opt.setName('id_usuario').setDescription('ID de Discord del usuario').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo del desbaneo').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

  return {
    name: 'unban',
    description: 'Desbanea a un usuario del servidor.',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const userId = interaction.options.getString('id_usuario', true);
      const reason = interaction.options.getString('motivo') || 'Desbaneo manual';
      const guild = interaction.guild!;

      try {
        await guild.bans.remove(userId, reason);
        await db.removeUserTempPunishments(guild.id, userId, Action.TEMPBAN);

        const targetUser = await interaction.client.users.fetch(userId).catch(() => ({ id: userId, tag: `User#${userId}` }));
        await modLogger.postCase(guild.id, targetUser, interaction.user, Action.UNBAN, reason);

        await interaction.reply({ content: `✅ Usuario con ID **${userId}** ha sido desbaneado.` });
      } catch (err: any) {
        await interaction.reply({ content: `❌ Error al desbanear: ${err.message}`, ephemeral: true });
      }
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0]) {
        await message.reply('Uso: `>>unban <id_usuario> [motivo]`');
        return;
      }
      const userId = args[0];
      const reason = args.slice(1).join(' ') || 'Desbaneo manual';
      const guild = message.guild!;

      try {
        await guild.bans.remove(userId, reason);
        await db.removeUserTempPunishments(guild.id, userId, Action.TEMPBAN);

        const targetUser = await message.client.users.fetch(userId).catch(() => ({ id: userId, tag: `User#${userId}` }));
        await modLogger.postCase(guild.id, targetUser, message.author, Action.UNBAN, reason);

        await message.reply(`✅ Usuario con ID **${userId}** ha sido desbaneado.`);
      } catch (err: any) {
        await message.reply(`❌ Error: ${err.message}`);
      }
    }
  };
}
