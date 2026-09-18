import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';
import { Database } from '../../database/Database.js';

export function createMaxmentionsCommand(db: Database): Command {
  const slashData = new SlashCommandBuilder()
    .setName('maxmentions')
    .setDescription('Establece el número máximo de menciones permitidas en un mensaje (0 para desactivar).')
    .addIntegerOption(opt => opt.setName('limite').setDescription('Límite de menciones (ej. 5 o 0 para desactivar)').setMinValue(0).setMaxValue(50).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  return {
    name: 'maxmentions',
    description: 'Límite de menciones en mensajes.',
    category: 'automod',
    userPermissions: [PermissionFlagsBits.ManageGuild],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const limit = interaction.options.getInteger('limite', true);
      await db.updateAutomodSettings(interaction.guild!.id, { max_mentions: limit });

      await interaction.reply({
        content: limit === 0 ? '🛡️ Límite de menciones **desactivado**.' : `🛡️ Límite de menciones establecido en un máximo de **${limit}** menciones.`
      });
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0] || isNaN(Number(args[0]))) {
        await message.reply('Uso: `>>maxmentions <número: ej 5 o 0>`');
        return;
      }
      const limit = Math.max(0, parseInt(args[0], 10));
      await db.updateAutomodSettings(message.guild!.id, { max_mentions: limit });
      await message.reply(limit === 0 ? '🛡️ Límite de menciones desactivado.' : `🛡️ Máximo de menciones establecido en **${limit}**.`);
    }
  };
}
