import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';
import { Action } from '../../types/index.js';

export class UnmuteCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'unmute',
      description: 'Quita el silencio a un miembro.',
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
      requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
      fullCategory: ['moderation']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a des-silenciar').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo') || 'Des-silencio manual';
    const guild = interaction.guild!;

    try {
      const member = await guild.members.fetch(targetUser.id);
      if (member.isCommunicationDisabled()) {
        await member.timeout(null, reason);
      }

      const settings = await this.container.db.getGuildSettings(guild.id);
      if (settings.mute_role_id && member.roles.cache.has(settings.mute_role_id)) {
        await member.roles.remove(settings.mute_role_id, reason);
      }

      await this.container.db.removeUserTempPunishments(guild.id, targetUser.id, Action.TEMPMUTE);
      await this.container.modLogger.postCase(guild.id, targetUser, interaction.user, Action.UNMUTE, reason);

      await interaction.reply({ content: `🔊 **${targetUser.tag}** ya no está silenciado.` });
    } catch (err: any) {
      await interaction.reply({ content: `❌ Error al des-silenciar: ${err.message}`, ephemeral: true });
    }
  }

  public override async messageRun(message: Message, args: Args) {
    const member = await args.pick('member').catch(async () => {
      const raw = await args.pick('string').catch(() => null);
      if (!raw) return null;
      return message.guild?.members.fetch(raw.replace(/[<@!>]/g, '')).catch(() => null);
    });

    if (!member) {
      await message.reply('Uso: `>>unmute <@usuario|id> [motivo]`');
      return;
    }

    const reason = (await args.rest('string').catch(() => '')) || 'Des-silencio manual';
    const guild = message.guild!;

    try {
      if (member.isCommunicationDisabled()) {
        await member.timeout(null, reason);
      }

      const settings = await this.container.db.getGuildSettings(guild.id);
      if (settings.mute_role_id && member.roles.cache.has(settings.mute_role_id)) {
        await member.roles.remove(settings.mute_role_id, reason);
      }

      await this.container.db.removeUserTempPunishments(guild.id, member.id, Action.TEMPMUTE);
      await this.container.modLogger.postCase(guild.id, member.user, message.author, Action.UNMUTE, reason);

      await message.reply(`🔊 **${member.user.tag}** ya no está silenciado.`);
    } catch (err: any) {
      await message.reply(`❌ Error: ${err.message}`);
    }
  }
}
