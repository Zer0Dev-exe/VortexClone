import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';
import { Database } from '../../database/Database.js';

export function createMaxlinesCommand(db: Database): Command {
  const slashData = new SlashCommandBuilder()
    .setName('maxlines')
    .setDescription('Establece el número máximo de saltos de línea permitidos por mensaje (0 para desactivar).')
    .addIntegerOption(opt => opt.setName('limite').setDescription('Límite de líneas (ej. 10 o 0)').setMinValue(0).setMaxValue(50).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  return {
    name: 'maxlines',
    description: 'Límite de saltos de línea en mensajes.',
    category: 'automod',
    userPermissions: [PermissionFlagsBits.ManageGuild],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const limit = interaction.options.getInteger('limite', true);
      await db.updateAutomodSettings(interaction.guild!.id, { max_lines: limit });

      await interaction.reply({
        content: limit === 0 ? '🛡️ Límite de líneas **desactivado**.' : `🛡️ Límite de líneas establecido en **${limit}** saltos de línea.`
      });
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0] || isNaN(Number(args[0]))) {
        await message.reply('Uso: `>>maxlines <número: ej 10 o 0>`');
        return;
      }
      const limit = Math.max(0, parseInt(args[0], 10));
      await db.updateAutomodSettings(message.guild!.id, { max_lines: limit });
      await message.reply(limit === 0 ? '🛡️ Límite de líneas desactivado.' : `🛡️ Máximo de líneas establecido en **${limit}**.`);
    }
  };
}
