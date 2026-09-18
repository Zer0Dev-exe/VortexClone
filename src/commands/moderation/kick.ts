import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command, Action } from '../../types/index.js';
import { Database } from '../../database/Database.js';
import { ModLogger } from '../../logging/ModLogger.js';

export function createKickCommand(db: Database, modLogger: ModLogger): Command {
  const slashData = new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa a un miembro del servidor.')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo de la expulsión').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

  return {
    name: 'kick',
    description: 'Expulsa a un miembro del servidor.',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.KickMembers],
    botPermissions: [PermissionFlagsBits.KickMembers],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const targetUser = interaction.options.getUser('usuario', true);
      const reason = interaction.options.getString('motivo') || 'Sin motivo especificado';
      const guild = interaction.guild!;

      try {
        const member = await guild.members.fetch(targetUser.id);
        if (!member.kickable) {
          await interaction.reply({ content: '❌ No puedo expulsar a este usuario (su rol es superior o igual al mío).', ephemeral: true });
          return;
        }

        await targetUser.send(`👢 Has sido expulsado de **${guild.name}**. Motivo: ${reason}`).catch(() => {});
        await member.kick(reason);

        await modLogger.postCase(guild.id, targetUser, interaction.user, Action.KICK, reason);
        await interaction.reply({ content: `👢 **${targetUser.tag}** ha sido expulsado.` });
      } catch (err: any) {
        await interaction.reply({ content: `❌ Error al expulsar: ${err.message}`, ephemeral: true });
      }
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0]) {
        await message.reply('Uso: `>>kick <@usuario|id> [motivo]`');
        return;
      }
      const mention = message.mentions.users.first();
      const userId = mention ? mention.id : args[0].replace(/[<@!>]/g, '');
      const reason = args.slice(1).join(' ') || 'Sin motivo especificado';
      const guild = message.guild!;

      try {
        const member = await guild.members.fetch(userId);
        if (!member.kickable) {
          await message.reply('❌ No puedo expulsar a este miembro.');
          return;
        }

        await member.user.send(`👢 Has sido expulsado de **${guild.name}**. Motivo: ${reason}`).catch(() => {});
        await member.kick(reason);

        await modLogger.postCase(guild.id, member.user, message.author, Action.KICK, reason);
        await message.reply(`👢 **${member.user.tag}** ha sido expulsado.`);
      } catch (err: any) {
        await message.reply(`❌ Error: ${err.message}`);
      }
    }
  };
}
