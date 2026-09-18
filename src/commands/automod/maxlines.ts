import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';

export class MaxlinesCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'maxlines',
      description: 'Establece el número máximo de saltos de línea permitidos por mensaje (0 para desactivar).',
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
            .setDescription('Límite de líneas (ej. 10 o 0)')
            .setMinValue(0)
            .setMaxValue(50)
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const limit = interaction.options.getInteger('limite', true);
    await this.container.db.updateAutomodSettings(interaction.guild!.id, { max_lines: limit });

    await interaction.reply({
      content: limit === 0 ? '🛡️ Límite de líneas **desactivado**.' : `🛡️ Límite de líneas establecido en **${limit}** saltos de línea.`
    });
  }

  public override async messageRun(message: Message, args: Args) {
    const limitNum = await args.pick('integer').catch(() => null);
    if (limitNum === null) {
      await message.reply('Uso: `>>maxlines <número: ej 10 o 0>`');
      return;
    }

    const limit = Math.max(0, limitNum);
    await this.container.db.updateAutomodSettings(message.guild!.id, { max_lines: limit });
    await message.reply(limit === 0 ? '🛡️ Límite de líneas desactivado.' : `🛡️ Máximo de líneas establecido en **${limit}**.`);
  }
}
