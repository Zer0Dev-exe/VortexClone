import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';
import { Database } from '../../database/Database.js';

export function createAntiinviteCommand(db: Database): Command {
  const slashData = new SlashCommandBuilder()
    .setName('antiinvite')
    .setDescription('Configura el filtro anti-invitaciones.')
    .addStringOption(opt =>
      opt.setName('modo')
        .setDescription('Comportamiento ante invitaciones no autorizadas')
        .addChoices(
          { name: 'Desactivado (off)', value: 'off' },
          { name: 'Solo eliminar mensaje (delete)', value: 'del' },
          { name: 'Eliminar y dar 1 Strike', value: '1' },
          { name: 'Eliminar y dar 2 Strikes', value: '2' },
          { name: 'Eliminar y dar 3 Strikes', value: '3' }
        )
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  return {
    name: 'antiinvite',
    description: 'Configura el filtro anti-invitaciones.',
    category: 'automod',
    userPermissions: [PermissionFlagsBits.ManageGuild],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const mode = interaction.options.getString('modo', true);
      const val = mode === 'off' ? 0 : mode === 'del' ? 1 : parseInt(mode, 10);

      await db.updateAutomodSettings(interaction.guild!.id, { anti_invite: val });
      await interaction.reply({
        content: `🛡️ Anti-invitaciones actualizado: **${
          val === 0 ? 'Desactivado' : val === 1 ? 'Solo eliminar mensaje' : `Eliminar y aplicar ${val} strikes`
        }**.`
      });
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0]) {
        await message.reply('Uso: `>>antiinvite <off|del|1|2|3>`');
        return;
      }
      const mode = args[0].toLowerCase();
      const val = mode === 'off' ? 0 : mode === 'del' ? 1 : !isNaN(Number(mode)) ? parseInt(mode, 10) : 1;

      await db.updateAutomodSettings(message.guild!.id, { anti_invite: val });
      await message.reply(`🛡️ Anti-invitaciones actualizado a valor: **${val}**.`);
    }
  };
}
