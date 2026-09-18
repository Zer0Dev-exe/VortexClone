import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';

export class PrefixCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'prefix',
      description: 'Establece o consulta el prefijo de comandos de texto del servidor.',
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      fullCategory: ['settings']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(opt => opt.setName('nuevo_prefijo').setDescription('El nuevo prefijo (ej. ! o >>)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const newPrefix = interaction.options.getString('nuevo_prefijo');
    const guildId = interaction.guild!.id;

    if (!newPrefix) {
      const current = (await this.container.db.getGuildSettings(guildId)).prefix;
      await interaction.reply({ content: `ℹ️ El prefijo actual en este servidor es: \`${current}\`.` });
      return;
    }

    await this.container.db.updateGuildSettings(guildId, { prefix: newPrefix });
    await interaction.reply({ content: `✅ Prefijo actualizado correctamente a: \`${newPrefix}\`.` });
  }

  public override async messageRun(message: Message, args: Args) {
    const guildId = message.guild!.id;
    const newPrefix = await args.pick('string').catch(() => null);

    if (!newPrefix) {
      const current = (await this.container.db.getGuildSettings(guildId)).prefix;
      await message.reply(`El prefijo actual es: \`${current}\`.`);
      return;
    }

    await this.container.db.updateGuildSettings(guildId, { prefix: newPrefix });
    await message.reply(`✅ Prefijo actualizado a: \`${newPrefix}\`.`);
  }
}
