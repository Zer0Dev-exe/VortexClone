import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';

export class AutoraidmodeCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'autoraidmode',
      description: 'Configura la activación automática del modo Anti-Raid al detectar oleadas de ingresos.',
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
          opt.setName('uniones')
            .setDescription('Número de miembros entrando para activar el raidmode (0 para desactivar)')
            .setMinValue(0)
            .setMaxValue(100)
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('segundos')
            .setDescription('Ventana de tiempo en segundos (ej. 10s)')
            .setMinValue(5)
            .setMaxValue(120)
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const joins = interaction.options.getInteger('uniones', true);
    const seconds = interaction.options.getInteger('segundos') || 10;

    await this.container.db.updateAutomodSettings(interaction.guild!.id, {
      auto_raid_mode_number: joins,
      auto_raid_mode_time: seconds
    });

    await interaction.reply({
      content: joins === 0
        ? '🛡️ Detección automática de raids **desactivada**.'
        : `🛡️ Modo Anti-Raid se activará si entran **${joins} miembros en ${seconds} segundos**.`
    });
  }

  public override async messageRun(message: Message, args: Args) {
    const joinsNum = await args.pick('integer').catch(() => null);
    if (joinsNum === null) {
      await message.reply('Uso: `>>autoraidmode <uniones: ej 10 o 0> [segundos: ej 10]`');
      return;
    }

    const joins = Math.max(0, joinsNum);
    const seconds = (await args.pick('integer').catch(() => 10)) || 10;

    await this.container.db.updateAutomodSettings(message.guild!.id, {
      auto_raid_mode_number: joins,
      auto_raid_mode_time: seconds
    });

    await message.reply(
      joins === 0
        ? '🛡️ Detección automática de raids desactivada.'
        : `🛡️ Anti-Raid automático configurado: **${joins} uniones en ${seconds}s**.`
    );
  }
}
