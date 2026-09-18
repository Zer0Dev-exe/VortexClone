import {
  ChatInputCommandInteraction,
  ChannelType,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';
import { Database } from '../../database/Database.js';

export function createSetupCommand(db: Database): Command {
  const slashData = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configura los canales de registro y roles de moderación.')
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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  return {
    name: 'setup',
    description: 'Configura canales de logs y roles.',
    category: 'settings',
    userPermissions: [PermissionFlagsBits.Administrator],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
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

      await db.updateGuildSettings(guildId, updates);
      await interaction.reply({
        content: `✅ **Configuración guardada correctamente:**\n${changes.join('\n')}`
      });
    },

    executePrefix: async (message: Message, args: string[]) => {
      await message.reply('Usa el comando interactivo `/setup` con las opciones deseadas para configurar canales y roles.');
    }
  };
}
