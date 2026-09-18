import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel
} from 'discord.js';
import { Command } from '../../types/index.js';
import { parseDurationToSeconds } from '../../utils/time.js';

export function createSlowmodeCommand(): Command {
  const slashData = new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Ajusta el modo lento (slowmode) del canal.')
    .addStringOption(opt => opt.setName('tiempo').setDescription('Tiempo entre mensajes (ej. 5s, 1m, 1h, o 0 para desactivar)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

  return {
    name: 'slowmode',
    description: 'Ajusta el modo lento del canal.',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.ManageChannels],
    botPermissions: [PermissionFlagsBits.ManageChannels],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const timeStr = interaction.options.getString('tiempo', true);
      const seconds = timeStr === '0' || timeStr.toLowerCase() === 'off' ? 0 : parseDurationToSeconds(timeStr);

      if (seconds === null || seconds < 0 || seconds > 21600) {
        await interaction.reply({ content: '❌ Tiempo inválido. Debe estar entre 0s y 6 horas (21600s).', ephemeral: true });
        return;
      }

      const channel = interaction.channel;
      if (!(channel instanceof TextChannel)) {
        await interaction.reply({ content: '❌ Solo aplicable en canales de texto.', ephemeral: true });
        return;
      }

      try {
        await channel.setRateLimitPerUser(seconds, `Vortex slowmode por ${interaction.user.tag}`);
        await interaction.reply({
          content: seconds === 0 ? '🔓 Modo lento desactivado en este canal.' : `🔒 Modo lento establecido en **${timeStr}** (${seconds}s).`
        });
      } catch (err: any) {
        await interaction.reply({ content: `❌ Error al cambiar slowmode: ${err.message}`, ephemeral: true });
      }
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0]) {
        await message.reply('Uso: `>>slowmode <tiempo: ej 5s, 1m, o 0>`');
        return;
      }

      const timeStr = args[0];
      const seconds = timeStr === '0' || timeStr.toLowerCase() === 'off' ? 0 : parseDurationToSeconds(timeStr);
      if (seconds === null || seconds < 0 || seconds > 21600) {
        await message.reply('❌ Tiempo inválido. Debe estar entre 0s y 6h.');
        return;
      }

      const channel = message.channel;
      if (!(channel instanceof TextChannel)) return;

      try {
        await channel.setRateLimitPerUser(seconds, `Vortex slowmode por ${message.author.tag}`);
        await message.reply(seconds === 0 ? '🔓 Modo lento desactivado.' : `🔒 Modo lento: **${seconds}s**.`);
      } catch (err: any) {
        await message.reply(`❌ Error: ${err.message}`);
      }
    }
  };
}
