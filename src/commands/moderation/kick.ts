import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';
import { Action } from '../../types/index.js';

export class KickCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'kick',
      description: 'Expulsa a un miembro del servidor.',
      requiredUserPermissions: [PermissionFlagsBits.KickMembers],
      requiredClientPermissions: [PermissionFlagsBits.KickMembers],
      fullCategory: ['moderation']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo de la expulsión').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo') || 'Sin motivo especificado';
    const guild = interaction.guild!;

    try {
      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        await interaction.reply({ content: '❌ El usuario no está en el servidor.', ephemeral: true });
        return;
      }
      if (!member.kickable) {
        await interaction.reply({ content: '❌ No puedo expulsar a este usuario (su rol es superior o igual al mío).', ephemeral: true });
        return;
      }

      await targetUser.send(`👢 Has sido expulsado de **${guild.name}**. Motivo: ${reason}`).catch(() => {});
      await member.kick(reason);

      await this.container.modLogger.postCase(guild.id, targetUser, interaction.user, Action.KICK, reason);
      await interaction.reply({ content: `👢 **${targetUser.tag}** ha sido expulsado.` });
    } catch (err: any) {
      await interaction.reply({ content: `❌ Error al expulsar: ${err.message}`, ephemeral: true });
    }
  }

  public override async messageRun(message: Message, args: Args) {
    const member = await args.pick('member').catch(async () => {
      const raw = await args.pick('string').catch(() => null);
      if (!raw) return null;
      return message.guild?.members.fetch(raw.replace(/[<@!>]/g, '')).catch(() => null);
    });

    if (!member) {
      await message.reply('Uso: `>>kick <@usuario|id> [motivo]`');
      return;
    }

    const reason = (await args.rest('string').catch(() => '')) || 'Sin motivo especificado';
    const guild = message.guild!;

    try {
      if (!member.kickable) {
        await message.reply('❌ No puedo expulsar a este miembro (su rol es superior o igual al mío).');
        return;
      }

      await member.user.send(`👢 Has sido expulsado de **${guild.name}**. Motivo: ${reason}`).catch(() => {});
      await member.kick(reason);

      await this.container.modLogger.postCase(guild.id, member.user, message.author, Action.KICK, reason);
      await message.reply(`👢 **${member.user.tag}** ha sido expulsado.`);
    } catch (err: any) {
      await message.reply(`❌ Error: ${err.message}`);
    }
  }
}
