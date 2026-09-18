import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message, ChannelType } from 'discord.js';

export class SetupCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'setup',
      description: 'Configura los canales de registro y roles de moderación.',
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
      fullCategory: ['settings']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addChannelOption(opt =>
          opt.setName('modlog')
            .setDescription('Canal para casos y sanciones de moderación')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt.setName('serverlog')
            .setDescription('Canal para registros de miembros e ingresos')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt.setName('messagelog')
            .setDescription('Canal para mensajes editados y eliminados')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt.setName('voicelog')
            .setDescription('Canal para conexiones de voz')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addRoleOption(opt => opt.setName('muterole').setDescription('Rol para silenciar miembros').setRequired(false))
        .addRoleOption(opt => opt.setName('modrole').setDescription('Rol de moderadores').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const guildId = interaction.guild!.id;
    const modlog = interaction.options.getChannel('modlog');
    const serverlog = interaction.options.getChannel('serverlog');
    const messagelog = interaction.options.getChannel('messagelog');
    const voicelog = interaction.options.getChannel('voicelog');
    const muterole = interaction.options.getRole('muterole');
    const modrole = interaction.options.getRole('modrole');

    const updates: any = {};
    const changes: string[] = [];

    if (modlog) {
      updates.modlog_channel_id = modlog.id;
      changes.push(`• **Modlog**: <#${modlog.id}>`);
    }
    if (serverlog) {
      updates.serverlog_channel_id = serverlog.id;
      changes.push(`• **Serverlog**: <#${serverlog.id}>`);
    }
    if (messagelog) {
      updates.messagelog_channel_id = messagelog.id;
      changes.push(`• **Messagelog**: <#${messagelog.id}>`);
    }
    if (voicelog) {
      updates.voicelog_channel_id = voicelog.id;
      changes.push(`• **Voicelog**: <#${voicelog.id}>`);
    }
    if (muterole) {
      updates.mute_role_id = muterole.id;
      changes.push(`• **Mute Role**: <@&${muterole.id}>`);
    }
    if (modrole) {
      updates.mod_role_id = modrole.id;
      changes.push(`• **Mod Role**: <@&${modrole.id}>`);
    }

    if (changes.length === 0) {
      await interaction.reply({
        content: 'ℹ️ No especificaste ningún cambio. Pasa opciones como `modlog: #canal` o `muterole: @rol`.',
        ephemeral: true
      });
      return;
    }

    await this.container.db.updateGuildSettings(guildId, updates);
    await interaction.reply({
      content: `✅ **Configuración guardada correctamente:**\n${changes.join('\n')}`
    });
  }

  public override async messageRun(message: Message, _args: Args) {
    await message.reply('Usa el comando interactivo `/setup` con las opciones deseadas para configurar canales y roles.');
  }
}
