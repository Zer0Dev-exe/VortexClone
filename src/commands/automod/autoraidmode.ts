import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';
import { Database } from '../../database/Database.js';

export function createAutoraidmodeCommand(db: Database): Command {
  const slashData = new SlashCommandBuilder()
    .setName('autoraidmode')
    .setDescription('Configura la activación automática del modo Anti-Raid al detectar oleadas de ingresos.')
    .addIntegerOption(opt =>
      opt.setName('uniones')
        .setDescription('Número de miembros entrando para activar el raidmode (0 para desactivar)')
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('segundos')
        .setDescription('Ventana de tiempo en segundos (ej. 10s)')
        .setMinValue(5)
        .setMaxValue(120)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  return {
    name: 'autoraidmode',
    description: 'Configura la detección automática de raids.',
    category: 'automod',
    userPermissions: [PermissionFlagsBits.ManageGuild],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const joins = interaction.options.getInteger('uniones', true);
      const seconds = interaction.options.getInteger('segundos') || 10;

      await db.updateAutomodSettings(interaction.guild!.id, {
        auto_raid_mode_number: joins,
        auto_raid_mode_time: seconds
      });

      await interaction.reply({
        content: joins === 0
          ? '🛡️ Detección automática de raids **desactivada**.'
          : `🛡️ Modo Anti-Raid se activará si entran **${joins} miembros en ${seconds} segundos**.`
      });
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0] || isNaN(Number(args[0]))) {
        await message.reply('Uso: `>>autoraidmode <uniones: ej 10 o 0> [segundos: ej 10]`');
        return;
      }
      const joins = Math.max(0, parseInt(args[0], 10));
      const seconds = args[1] && !isNaN(Number(args[1])) ? parseInt(args[1], 10) : 10;

      await db.updateAutomodSettings(message.guild!.id, {
        auto_raid_mode_number: joins,
        auto_raid_mode_time: seconds
      });

      await message.reply(
        joins === 0
          ? '🛡️ Detección automática de raids desactivada.'
          : `🛡️ Anti-Raid automático configurado: **${joins} uniones en ${seconds}s**.`
      );
    }
  };
}
