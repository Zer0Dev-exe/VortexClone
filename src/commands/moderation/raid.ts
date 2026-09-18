import {
  ChatInputCommandInteraction,
  GuildVerificationLevel,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command, Action } from '../../types/index.js';
import { Database } from '../../database/Database.js';
import { ModLogger } from '../../logging/ModLogger.js';

export function createRaidCommand(db: Database, modLogger: ModLogger): Command {
  const slashData = new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Activa o desactiva manualmente el modo Anti-Raid / Lockdown del servidor.')
    .addStringOption(opt =>
      opt.setName('estado')
        .setDescription('Activar o desactivar')
        .addChoices({ name: 'Activar (on)', value: 'on' }, { name: 'Desactivar (off)', value: 'off' })
        .setRequired(true)
    )
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  return {
    name: 'raid',
    description: 'Activa o desactiva el modo Anti-Raid.',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [PermissionFlagsBits.ManageGuild],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const state = interaction.options.getString('estado', true);
      const reason = interaction.options.getString('motivo') || 'Activación manual por moderador';
      const guild = interaction.guild!;
      const isEnable = state === 'on';

      await db.updateGuildSettings(guild.id, { raid_mode: isEnable ? 1 : 0 });

      if (isEnable && guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        if (guild.verificationLevel < GuildVerificationLevel.High) {
          await guild.setVerificationLevel(GuildVerificationLevel.High, 'Vortex: Anti-Raid manual').catch(() => {});
        }
      }

      await modLogger.postCase(
        guild.id,
        { id: '0', tag: isEnable ? 'Modo Raid Activado' : 'Modo Raid Desactivado' },
        interaction.user,
        isEnable ? Action.RAIDMODE : Action.NORAIDMODE,
        reason
      );

      await interaction.reply({
        content: isEnable
          ? '🔒 **Modo Anti-Raid activado**. Las cuentas nuevas que intenten unirse serán bloqueadas/expulsadas.'
          : '🔓 **Modo Anti-Raid desactivado**. Entrada normal restaurada.'
      });
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0]) {
        await message.reply('Uso: `>>raid <on|off> [motivo]`');
        return;
      }
      const isEnable = args[0].toLowerCase() === 'on' || args[0].toLowerCase() === 'activar';
      const reason = args.slice(1).join(' ') || 'Manual por moderador';
      const guild = message.guild!;

      await db.updateGuildSettings(guild.id, { raid_mode: isEnable ? 1 : 0 });

      if (isEnable && guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        if (guild.verificationLevel < GuildVerificationLevel.High) {
          await guild.setVerificationLevel(GuildVerificationLevel.High, 'Vortex: Anti-Raid manual').catch(() => {});
        }
      }

      await modLogger.postCase(
        guild.id,
        { id: '0', tag: isEnable ? 'Modo Raid Activado' : 'Modo Raid Desactivado' },
        message.author,
        isEnable ? Action.RAIDMODE : Action.NORAIDMODE,
        reason
      );

      await message.reply(isEnable ? '🔒 **Modo Anti-Raid activado**.' : '🔓 **Modo Anti-Raid desactivado**.');
    }
  };
}
