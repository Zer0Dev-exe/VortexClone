import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';
import { Database } from '../../database/Database.js';

export function createAutodehoistCommand(db: Database): Command {
  const slashData = new SlashCommandBuilder()
    .setName('autodehoist')
    .setDescription('Configura el dehoist automático para miembros con nombres que empiezan por símbolos.')
    .addStringOption(opt =>
      opt.setName('caracter')
        .setDescription('Carácter límite superior (ej. "!" o "off" para desactivar)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  return {
    name: 'autodehoist',
    description: 'Configura el renombrado dehoist automático.',
    category: 'automod',
    userPermissions: [PermissionFlagsBits.ManageGuild],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const char = interaction.options.getString('caracter', true);
      const isOff = char.toLowerCase() === 'off' || char === '0';
      const value = isOff ? '' : char.charAt(0);

      await db.updateAutomodSettings(interaction.guild!.id, { auto_dehoist: value });
      await interaction.reply({
        content: isOff
          ? '🛡️ Auto-dehoist **desactivado**.'
          : `🛡️ Auto-dehoist **activado** para nombres que comiencen por caracteres <= "${value}".`
      });
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0]) {
        await message.reply('Uso: `>>autodehoist <!|off>`');
        return;
      }
      const char = args[0];
      const isOff = char.toLowerCase() === 'off' || char === '0';
      const value = isOff ? '' : char.charAt(0);

      await db.updateAutomodSettings(message.guild!.id, { auto_dehoist: value });
      await message.reply(isOff ? '🛡️ Auto-dehoist desactivado.' : `🛡️ Auto-dehoist activo para caracteres <= "${value}".`);
    }
  };
}
