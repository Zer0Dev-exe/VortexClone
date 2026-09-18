import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';

export class AntiinviteCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'antiinvite',
      description: 'Configura el filtro anti-invitaciones.',
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
          opt.setName('modo')
            .setDescription('Comportamiento ante invitaciones no autorizadas')
            .addChoices(
              { name: 'Desactivado (off)', value: 'off' },
              { name: 'Solo eliminar mensaje (delete)', value: 'del' },
              { name: 'Eliminar y dar 1 Strike', value: '1' },
              { name: 'Eliminar y dar 2 Strikes', value: '2' },
              { name: 'Eliminar y dar 3 Strikes', value: '3' }
            )
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const mode = interaction.options.getString('modo', true);
    const val = mode === 'off' ? 0 : mode === 'del' ? 1 : parseInt(mode, 10);

    await this.container.db.updateAutomodSettings(interaction.guild!.id, { anti_invite: val });
    await interaction.reply({
      content: `🛡️ Anti-invitaciones actualizado: **${
        val === 0 ? 'Desactivado' : val === 1 ? 'Solo eliminar mensaje' : `Eliminar y aplicar ${val} strikes`
      }**.`
    });
  }

  public override async messageRun(message: Message, args: Args) {
    const modeArg = await args.pick('string').catch(() => null);
    if (!modeArg) {
      await message.reply('Uso: `>>antiinvite <off|del|1|2|3>`');
      return;
    }

    const mode = modeArg.toLowerCase();
    const val = mode === 'off' ? 0 : mode === 'del' ? 1 : !isNaN(Number(mode)) ? parseInt(mode, 10) : 1;

    await this.container.db.updateAutomodSettings(message.guild!.id, { anti_invite: val });
    await message.reply(`🛡️ Anti-invitaciones actualizado a valor: **${val}**.`);
  }
}
