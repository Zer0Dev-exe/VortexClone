import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';
import { Action } from '../../types/index.js';

export class PardonCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'pardon',
      description: 'Perdona/reduce strikes a un usuario.',
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
      fullCategory: ['moderation']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a perdonar').setRequired(true))
        .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de strikes a remover (por defecto 1)').setRequired(false))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo del perdón').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('usuario', true);
    const amount = interaction.options.getInteger('cantidad') || 1;
    const reason = interaction.options.getString('motivo') || 'Perdón de moderación';
    const guild = interaction.guild!;

    try {
      const remaining = await this.container.db.pardonStrikes(guild.id, targetUser.id, amount);
      await this.container.modLogger.postCase(
        guild.id,
        targetUser,
        interaction.user,
        Action.PARDON,
        `[-${amount} Strike(s) | Restantes: ${remaining}] ${reason}`
      );

      await interaction.reply({
        content: `🏳️ Se han removido **${amount}** strike(s) a **${targetUser.tag}**. Strikes restantes: **${remaining}**.`
      });
    } catch (err: any) {
      await interaction.reply({ content: `❌ Error al perdonar strikes: ${err.message}`, ephemeral: true });
    }
  }

  public override async messageRun(message: Message, args: Args) {
    const targetUser = await args.pick('user').catch(async () => {
      const raw = await args.pick('string').catch(() => null);
      if (!raw) return null;
      return message.client.users.fetch(raw.replace(/[<@!>]/g, '')).catch(() => null);
    });

    if (!targetUser) {
      await message.reply('Uso: `>>pardon <@usuario|id> [cantidad] [motivo]`');
      return;
    }

    let amount = await args.pick('integer').catch(() => 1);
    const reason = (await args.rest('string').catch(() => '')) || 'Perdón de moderación';
    const guild = message.guild!;

    try {
      const remaining = await this.container.db.pardonStrikes(guild.id, targetUser.id, amount);

      await this.container.modLogger.postCase(
        guild.id,
        targetUser,
        message.author,
        Action.PARDON,
        `[-${amount} Strike(s) | Restantes: ${remaining}] ${reason}`
      );

      await message.reply(`🏳️ Se han removido **${amount}** strike(s) a **${targetUser.tag}**. Restantes: **${remaining}**.`);
    } catch (err: any) {
      await message.reply(`❌ Error: ${err.message}`);
    }
  }
}
