import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';
import { Action } from '../../types/index.js';

export class UnbanCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'unban',
      description: 'Desbanea a un usuario del servidor por su ID.',
      requiredUserPermissions: [PermissionFlagsBits.BanMembers],
      requiredClientPermissions: [PermissionFlagsBits.BanMembers],
      fullCategory: ['moderation']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(opt => opt.setName('id_usuario').setDescription('ID de Discord del usuario').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo del desbaneo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const userId = interaction.options.getString('id_usuario', true);
    const reason = interaction.options.getString('motivo') || 'Desbaneo manual';
    const guild = interaction.guild!;

    try {
      await guild.bans.remove(userId, reason);
      await this.container.db.removeUserTempPunishments(guild.id, userId, Action.TEMPBAN);

      const targetUser = await interaction.client.users.fetch(userId).catch(() => ({ id: userId, tag: `User#${userId}` }));
      await this.container.modLogger.postCase(guild.id, targetUser, interaction.user, Action.UNBAN, reason);

      await interaction.reply({ content: `✅ Usuario con ID **${userId}** ha sido desbaneado.` });
    } catch (err: any) {
      await interaction.reply({ content: `❌ Error al desbanear: ${err.message}`, ephemeral: true });
    }
  }

  public override async messageRun(message: Message, args: Args) {
    const userId = await args.pick('string').catch(() => null);
    if (!userId) {
      await message.reply('Uso: `>>unban <id_usuario> [motivo]`');
      return;
    }

    const reason = (await args.rest('string').catch(() => '')) || 'Desbaneo manual';
    const guild = message.guild!;

    try {
      await guild.bans.remove(userId, reason);
      await this.container.db.removeUserTempPunishments(guild.id, userId, Action.TEMPBAN);

      const targetUser = await message.client.users.fetch(userId).catch(() => ({ id: userId, tag: `User#${userId}` }));
      await this.container.modLogger.postCase(guild.id, targetUser, message.author, Action.UNBAN, reason);

      await message.reply(`✅ Usuario con ID **${userId}** ha sido desbaneado.`);
    } catch (err: any) {
      await message.reply(`❌ Error: ${err.message}`);
    }
  }
}
