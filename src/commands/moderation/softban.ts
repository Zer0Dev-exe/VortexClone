import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command, Action } from '../../types/index.js';
import { Database } from '../../database/Database.js';
import { ModLogger } from '../../logging/ModLogger.js';

export function createSoftbanCommand(db: Database, modLogger: ModLogger): Command {
  const slashData = new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Banea y desbanea de inmediato a un usuario para purgar sus mensajes recientes.')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a softbanear').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

  return {
    name: 'softban',
    description: 'Banea y desbanea de inmediato para purgar mensajes.',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const targetUser = interaction.options.getUser('usuario', true);
      const reason = interaction.options.getString('motivo') || 'Softban de limpieza de mensajes';
      const guild = interaction.guild!;

      try {
        await targetUser.send(`🍌 Has recibido softban en **${guild.name}**. Motivo: ${reason}`).catch(() => {});
        await guild.bans.create(targetUser.id, { deleteMessageSeconds: 86400, reason });
        await guild.bans.remove(targetUser.id, 'Vortex Softban: Desbaneo inmediato');

        await modLogger.postCase(guild.id, targetUser, interaction.user, Action.SOFTBAN, reason);
        await interaction.reply({ content: `🍌 **${targetUser.tag}** ha recibido softban (mensajes de las últimas 24h eliminados).` });
      } catch (err: any) {
        await interaction.reply({ content: `❌ Error al softbanear: ${err.message}`, ephemeral: true });
      }
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0]) {
        await message.reply('Uso: `>>softban <@usuario|id> [motivo]`');
        return;
      }
      const mention = message.mentions.users.first();
      const userId = mention ? mention.id : args[0].replace(/[<@!>]/g, '');
      const reason = args.slice(1).join(' ') || 'Softban de limpieza de mensajes';
      const guild = message.guild!;

      try {
        const targetUser = await message.client.users.fetch(userId);
        await targetUser.send(`🍌 Has recibido softban en **${guild.name}**. Motivo: ${reason}`).catch(() => {});
        await guild.bans.create(targetUser.id, { deleteMessageSeconds: 86400, reason });
        await guild.bans.remove(targetUser.id, 'Vortex Softban: Desbaneo inmediato');

        await modLogger.postCase(guild.id, targetUser, message.author, Action.SOFTBAN, reason);
        await message.reply(`🍌 **${targetUser.tag}** ha recibido softban.`);
      } catch (err: any) {
        await message.reply(`❌ Error: ${err.message}`);
      }
    }
  };
}
