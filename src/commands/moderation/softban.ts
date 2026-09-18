import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';
import { Action } from '../../types/index.js';

export class SoftbanCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'softban',
      description: 'Banea y desbanea de inmediato a un usuario para purgar sus mensajes recientes.',
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
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a softbanear').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo') || 'Softban de limpieza de mensajes';
    const guild = interaction.guild!;

    try {
      await targetUser.send(`🍌 Has recibido softban en **${guild.name}**. Motivo: ${reason}`).catch(() => {});
      await guild.bans.create(targetUser.id, { deleteMessageSeconds: 86400, reason });
      await guild.bans.remove(targetUser.id, 'Vortex Softban: Desbaneo inmediato');

      await this.container.modLogger.postCase(guild.id, targetUser, interaction.user, Action.SOFTBAN, reason);
      await interaction.reply({ content: `🍌 **${targetUser.tag}** ha recibido softban (mensajes de las últimas 24h eliminados).` });
    } catch (err: any) {
      await interaction.reply({ content: `❌ Error al softbanear: ${err.message}`, ephemeral: true });
    }
  }

  public override async messageRun(message: Message, args: Args) {
    const targetUser = await args.pick('user').catch(async () => {
      const raw = await args.pick('string').catch(() => null);
      if (!raw) return null;
      return message.client.users.fetch(raw.replace(/[<@!>]/g, '')).catch(() => null);
    });

    if (!targetUser) {
      await message.reply('Uso: `>>softban <@usuario|id> [motivo]`');
      return;
    }

    const reason = (await args.rest('string').catch(() => '')) || 'Softban de limpieza de mensajes';
    const guild = message.guild!;

    try {
      await targetUser.send(`🍌 Has recibido softban en **${guild.name}**. Motivo: ${reason}`).catch(() => {});
      await guild.bans.create(targetUser.id, { deleteMessageSeconds: 86400, reason });
      await guild.bans.remove(targetUser.id, 'Vortex Softban: Desbaneo inmediato');

      await this.container.modLogger.postCase(guild.id, targetUser, message.author, Action.SOFTBAN, reason);
      await message.reply(`🍌 **${targetUser.tag}** ha recibido softban.`);
    } catch (err: any) {
      await message.reply(`❌ Error: ${err.message}`);
    }
  }
}
