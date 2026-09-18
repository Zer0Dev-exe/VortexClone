import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';

export class AutodehoistCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'autodehoist',
      description: 'Configura el dehoist automático para miembros con nombres que empiezan por símbolos.',
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      fullCategory: ['automod']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(opt =>
          opt.setName('caracter')
            .setDescription('Carácter límite superior (ej. "!" o "off" para desactivar)')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const char = interaction.options.getString('caracter', true);
    const isOff = char.toLowerCase() === 'off' || char === '0';
    const value = isOff ? '' : char.charAt(0);

    await this.container.db.updateAutomodSettings(interaction.guild!.id, { auto_dehoist: value });
    await interaction.reply({
      content: isOff
        ? '🛡️ Auto-dehoist **desactivado**.'
        : `🛡️ Auto-dehoist **activado** para nombres que comiencen por caracteres <= "${value}".`
    });
  }

  public override async messageRun(message: Message, args: Args) {
    const char = await args.pick('string').catch(() => null);
    if (!char) {
      await message.reply('Uso: `>>autodehoist <!|off>`');
      return;
    }

    const isOff = char.toLowerCase() === 'off' || char === '0';
    const value = isOff ? '' : char.charAt(0);

    await this.container.db.updateAutomodSettings(message.guild!.id, { auto_dehoist: value });
    await message.reply(isOff ? '🛡️ Auto-dehoist desactivado.' : `🛡️ Auto-dehoist activo para caracteres <= "${value}".`);
  }
}
