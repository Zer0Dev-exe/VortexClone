import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message, EmbedBuilder } from 'discord.js';

export class SettingsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'settings',
      description: 'Muestra la configuración actual de Vortex en el servidor.',
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      fullCategory: ['settings']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const guildId = interaction.guild!.id;
    const gSettings = await this.container.db.getGuildSettings(guildId);
    const am = await this.container.db.getAutomodSettings(guildId);
    const punishments = await this.container.db.getPunishments(guildId);
    const filters = await this.container.db.getFilters(guildId);
    const whitelist = await this.container.db.getInviteWhitelist(guildId);

    const embed = new EmbedBuilder()
      .setTitle(`🌀 Configuración de Vortex | ${interaction.guild!.name}`)
      .setColor(0x3498db)
      .addFields(
        {
          name: '📁 Canales de Registro',
          value: [
            `• **Modlog**: ${gSettings.modlog_channel_id ? `<#${gSettings.modlog_channel_id}>` : '*No asignado*'}`,
            `• **Serverlog**: ${gSettings.serverlog_channel_id ? `<#${gSettings.serverlog_channel_id}>` : '*No asignado*'}`,
            `• **Messagelog**: ${gSettings.messagelog_channel_id ? `<#${gSettings.messagelog_channel_id}>` : '*No asignado*'}`,
            `• **Voicelog**: ${gSettings.voicelog_channel_id ? `<#${gSettings.voicelog_channel_id}>` : '*No asignado*'}`
          ].join('\n'),
          inline: false
        },
        {
          name: '🎭 Roles y Modos',
          value: [
            `• **Prefijo de texto**: \`${gSettings.prefix}\``,
            `• **Rol Muted**: ${gSettings.mute_role_id ? `<@&${gSettings.mute_role_id}>` : '*Timeout nativo*'}`,
            `• **Rol Mod**: ${gSettings.mod_role_id ? `<@&${gSettings.mod_role_id}>` : '*Permisos de Discord*'}`,
            `• **Modo Anti-Raid**: ${gSettings.raid_mode ? '🔒 **Activo**' : '🔓 Inactivo'}`
          ].join('\n'),
          inline: false
        },
        {
          name: '🛡️ Filtros de AutoMod',
          value: [
            `• **Anti-Invitaciones**: ${am.anti_invite === 0 ? 'Off' : am.anti_invite === 1 ? 'Borrar' : `${am.anti_invite} strikes`}`,
            `• **Anti-Everyone**: ${am.anti_everyone ? 'Activo' : 'Off'}`,
            `• **Anti-Duplicados**: ${am.anti_duplicate ? `${am.anti_duplicate} strikes` : 'Off'}`,
            `• **Anti-Copypasta**: ${am.anti_copypasta ? 'Activo' : 'Off'}`,
            `• **Anti-Referidos**: ${am.anti_referral ? 'Activo' : 'Off'}`,
            `• **Máx Líneas**: ${am.max_lines || 'Off'}`,
            `• **Máx Menciones**: ${am.max_mentions || 'Off'}`,
            `• **Auto-Dehoist**: ${am.auto_dehoist ? `Carácter: "${am.auto_dehoist}"` : 'Off'}`,
            `• **Auto-Raidmode**: ${am.auto_raid_mode_number ? `${am.auto_raid_mode_number} en ${am.auto_raid_mode_time}s` : 'Off'}`
          ].join('\n'),
          inline: false
        },
        {
          name: `⚖️ Escalado de Sanciones (${punishments.length})`,
          value: punishments.length > 0
            ? punishments.map(p => `• **${p.strike_count} strikes**: ${p.action} ${p.duration_seconds > 0 ? `(${p.duration_seconds}s)` : ''}`).join('\n')
            : '*Sin reglas configuradas. Usa `/punishment set`.*',
          inline: false
        },
        {
          name: '📋 Filtros y Listas Blancas',
          value: [
            `• **Palabras/Regex prohibidos**: ${filters.length}`,
            `• **Invitaciones en lista blanca**: ${whitelist.length}`
          ].join('\n'),
          inline: false
        }
      )
      .setFooter({ text: 'Vortex Moderation Bot' });

    await interaction.reply({ embeds: [embed] });
  }

  public override async messageRun(message: Message, _args: Args) {
    const guildId = message.guild!.id;
    const gSettings = await this.container.db.getGuildSettings(guildId);
    const am = await this.container.db.getAutomodSettings(guildId);

    const embed = new EmbedBuilder()
      .setTitle(`🌀 Configuración de Vortex`)
      .setColor(0x3498db)
      .setDescription(`**Prefijo:** \`${gSettings.prefix}\`\n**Modlog:** ${gSettings.modlog_channel_id ? `<#${gSettings.modlog_channel_id}>` : 'Ninguno'}\n**Anti-Invite:** ${am.anti_invite ? 'Activo' : 'Off'}`)
      .setFooter({ text: 'Usa /settings para el panel completo' });

    await message.reply({ embeds: [embed] });
  }
}
