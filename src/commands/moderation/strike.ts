import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';
import { Database } from '../../database/Database.js';
import { StrikeHandler } from '../../automod/StrikeHandler.js';

export function createStrikeCommand(db: Database, strikeHandler: StrikeHandler): Command {
  const slashData = new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Asigna strikes a un usuario y ejecuta la sanción escalada correspondiente.')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a sancionar').setRequired(true))
    .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de strikes a agregar (por defecto 1)').setRequired(false))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

  return {
    name: 'strike',
    description: 'Asigna strikes a un usuario.',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.ModerateMembers],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const targetUser = interaction.options.getUser('usuario', true);
      const amount = interaction.options.getInteger('cantidad') || 1;
      const reason = interaction.options.getString('motivo') || 'Sanción manual de moderación';
      const guild = interaction.guild!;

      try {
        const result = await strikeHandler.applyStrikes(guild, targetUser, interaction.user, amount, reason);
        let replyMsg = `🚩 Se han añadido **${amount}** strike(s) a **${targetUser.tag}**. Total acumulado: **${result.newStrikes}**.`;
        if (result.punishmentExecuted) {
          replyMsg += `\n⚡ Sanción escalada ejecutada: **${result.punishmentExecuted}**.`;
        }

        await interaction.reply({ content: replyMsg });
      } catch (err: any) {
        await interaction.reply({ content: `❌ Error al aplicar strike: ${err.message}`, ephemeral: true });
      }
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0]) {
        await message.reply('Uso: `>>strike <@usuario|id> [cantidad] [motivo]`');
        return;
      }
      const mention = message.mentions.users.first();
      const userId = mention ? mention.id : args[0].replace(/[<@!>]/g, '');

      let amount = 1;
      let remainingArgs = args.slice(1);
      if (remainingArgs.length > 0 && !isNaN(Number(remainingArgs[0]))) {
        amount = parseInt(remainingArgs[0], 10);
        remainingArgs = remainingArgs.slice(1);
      }

      const reason = remainingArgs.join(' ') || 'Sanción manual de moderación';
      const guild = message.guild!;

      try {
        const targetUser = await message.client.users.fetch(userId);
        const result = await strikeHandler.applyStrikes(guild, targetUser, message.author, amount, reason);

        let replyMsg = `🚩 Se han añadido **${amount}** strike(s) a **${targetUser.tag}**. Total acumulado: **${result.newStrikes}**.`;
        if (result.punishmentExecuted) {
          replyMsg += `\n⚡ Sanción escalada ejecutada: **${result.punishmentExecuted}**.`;
        }

        await message.reply(replyMsg);
      } catch (err: any) {
        await message.reply(`❌ Error: ${err.message}`);
      }
    }
  };
}
