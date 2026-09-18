import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';

export class MaxmentionsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'maxmentions',
      description: 'Establece el número máximo de menciones permitidas en un mensaje (0 para desactivar).',
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      fullCategory: ['automod']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addIntegerOption(opt =>
          opt.setName('limite')
            .setDescription('Límite de menciones (ej. 5 o 0 para desactivar)')
            .setMinValue(0)
            .setMaxValue(50)
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const limit = interaction.options.getInteger('limite', true);
    await this.container.db.updateAutomodSettings(interaction.guild!.id, { max_mentions: limit });

    await interaction.reply({
      content: limit === 0 ? '🛡️ Límite de menciones **desactivado**.' : `🛡️ Límite de menciones establecido en un máximo de **${limit}** menciones.`
    });
  }

  public override async messageRun(message: Message, args: Args) {
    const limitNum = await args.pick('integer').catch(() => null);
    if (limitNum === null) {
      await message.reply('Uso: `>>maxmentions <número: ej 5 o 0>`');
      return;
    }

    const limit = Math.max(0, limitNum);
    await this.container.db.updateAutomodSettings(message.guild!.id, { max_mentions: limit });
    await message.reply(limit === 0 ? '🛡️ Límite de menciones desactivado.' : `🛡️ Máximo de menciones establecido en **${limit}**.`);
  }
}
