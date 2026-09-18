import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';
import { ModLogger } from '../../logging/ModLogger.js';

export function createReasonCommand(modLogger: ModLogger): Command {
  const slashData = new SlashCommandBuilder()
    .setName('reason')
    .setDescription('Modifica el motivo de un caso de moderación existente.')
    .addIntegerOption(opt => opt.setName('caso').setDescription('Número del caso a actualizar').setRequired(true))
    .addStringOption(opt => opt.setName('nuevo_motivo').setDescription('El nuevo motivo').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

  return {
    name: 'reason',
    description: 'Modifica el motivo de un caso de moderación.',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.ModerateMembers],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const caseNumber = interaction.options.getInteger('caso', true);
      const newReason = interaction.options.getString('nuevo_motivo', true);
      const guild = interaction.guild!;

      const success = await modLogger.updateCaseReason(guild.id, caseNumber, newReason);
      if (success) {
        await interaction.reply({ content: `✅ Motivo del caso **#${caseNumber}** actualizado correctamente a: "${newReason}".` });
      } else {
        await interaction.reply({ content: `❌ No se encontró ningún caso con el número **#${caseNumber}** en este servidor.`, ephemeral: true });
      }
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0] || isNaN(Number(args[0])) || !args[1]) {
        await message.reply('Uso: `>>reason <número_caso> <nuevo_motivo>`');
        return;
      }
      const caseNumber = parseInt(args[0], 10);
      const newReason = args.slice(1).join(' ');
      const guild = message.guild!;

      const success = await modLogger.updateCaseReason(guild.id, caseNumber, newReason);
      if (success) {
        await message.reply(`✅ Motivo del caso **#${caseNumber}** actualizado.`);
      } else {
        await message.reply(`❌ No se encontró el caso **#${caseNumber}**.`);
      }
    }
  };
}
