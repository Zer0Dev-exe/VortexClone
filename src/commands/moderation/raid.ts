import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message, GuildVerificationLevel } from 'discord.js';
import { Action } from '../../types/index.js';

export class RaidCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'raid',
      description: 'Activa o desactiva manualmente el modo Anti-Raid / Lockdown del servidor.',
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      fullCategory: ['moderation']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(opt =>
          opt.setName('estado')
            .setDescription('Activar o desactivar')
            .addChoices({ name: 'Activar (on)', value: 'on' }, { name: 'Desactivar (off)', value: 'off' })
            .setRequired(true)
        )
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const state = interaction.options.getString('estado', true);
    const reason = interaction.options.getString('motivo') || 'Activación manual por moderador';
    const guild = interaction.guild!;
    const isEnable = state === 'on';

    await this.container.db.updateGuildSettings(guild.id, { raid_mode: isEnable ? 1 : 0 });

    if (isEnable && guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      if (guild.verificationLevel < GuildVerificationLevel.High) {
        await guild.setVerificationLevel(GuildVerificationLevel.High, 'Vortex: Anti-Raid manual').catch(() => {});
      }
    }

    await this.container.modLogger.postCase(
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
  }

  public override async messageRun(message: Message, args: Args) {
    const state = await args.pick('string').catch(() => null);
    if (!state) {
      await message.reply('Uso: `>>raid <on|off> [motivo]`');
      return;
    }

    const isEnable = state.toLowerCase() === 'on' || state.toLowerCase() === 'activar';
    const reason = (await args.rest('string').catch(() => '')) || 'Manual por moderador';
    const guild = message.guild!;

    await this.container.db.updateGuildSettings(guild.id, { raid_mode: isEnable ? 1 : 0 });

    if (isEnable && guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      if (guild.verificationLevel < GuildVerificationLevel.High) {
        await guild.setVerificationLevel(GuildVerificationLevel.High, 'Vortex: Anti-Raid manual').catch(() => {});
      }
    }

    await this.container.modLogger.postCase(
      guild.id,
      { id: '0', tag: isEnable ? 'Modo Raid Activado' : 'Modo Raid Desactivado' },
      message.author,
      isEnable ? Action.RAIDMODE : Action.NORAIDMODE,
      reason
    );

    await message.reply(isEnable ? '🔒 **Modo Anti-Raid activado**.' : '🔓 **Modo Anti-Raid desactivado**.');
  }
}
