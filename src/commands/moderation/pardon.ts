import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command, Action } from '../../types/index.js';
import { Database } from '../../database/Database.js';
import { ModLogger } from '../../logging/ModLogger.js';

export function createPardonCommand(db: Database, modLogger: ModLogger): Command {
  const slashData = new SlashCommandBuilder()
    .setName('pardon')
    .setDescription('Perdona/reduce strikes a un usuario.')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a perdonar').setRequired(true))
    .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de strikes a remover (por defecto 1)').setRequired(false))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo del perdón').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

  return {
    name: 'pardon',
    description: 'Reduce strikes a un usuario.',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.ModerateMembers],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const targetUser = interaction.options.getUser('usuario', true);
      const amount = interaction.options.getInteger('cantidad') || 1;
      const reason = interaction.options.getString('motivo') || 'Perdón de moderación';
      const guild = interaction.guild!;

      try {
        const remaining = await db.pardonStrikes(guild.id, targetUser.id, amount);
        await modLogger.postCase(
          guild.id,
          targetUser,
          interaction.user,
          Action.PARDON,
          `[-${amount} Strike(s) | Restantes: ${remaining}] ${reason}`
        );

        await interaction.reply({
          content: `🏳️ Se han removido **${amount}** strike(s) a **${targetUser.tag}**. Strikes restantes: **${remaining}**.`
        });
      } catch (err: any) {
        await interaction.reply({ content: `❌ Error al perdonar strikes: ${err.message}`, ephemeral: true });
      }
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0]) {
        await message.reply('Uso: `>>pardon <@usuario|id> [cantidad] [motivo]`');
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

      const reason = remainingArgs.join(' ') || 'Perdón de moderación';
      const guild = message.guild!;

      try {
        const targetUser = await message.client.users.fetch(userId);
        const remaining = await db.pardonStrikes(guild.id, targetUser.id, amount);

        await modLogger.postCase(
          guild.id,
          targetUser,
          message.author,
          Action.PARDON,
          `[-${amount} Strike(s) | Restantes: ${remaining}] ${reason}`
        );

        await message.reply(`🏳️ Se han removido **${amount}** strike(s) a **${targetUser.tag}**. Restantes: **${remaining}**.`);
      } catch (err: any) {
        await message.reply(`❌ Error: ${err.message}`);
      }
    }
  };
}
