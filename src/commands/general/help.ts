import { Command, Args } from '@sapphire/framework';
import { EmbedBuilder, Message } from 'discord.js';

export class HelpCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'help',
      description: 'Muestra la lista de comandos disponibles en Vortex.',
      fullCategory: ['general']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const categories: Record<string, string[]> = {
      moderation: [],
      automod: [],
      settings: [],
      general: []
    };

    for (const cmd of this.store.values()) {
      const cat = cmd.fullCategory[0]?.toLowerCase() || 'general';
      if (categories[cat]) {
        categories[cat].push(`\`/${cmd.name}\` - ${cmd.description}`);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🌀 Guía de Comandos de Vortex (Sapphire)')
      .setColor(0x3498db)
      .addFields(
        { name: '🛡️ Moderación', value: categories.moderation.join('\n') || 'Ninguno' },
        { name: '🤖 AutoMod', value: categories.automod.join('\n') || 'Ninguno' },
        { name: '⚙️ Configuración', value: categories.settings.join('\n') || 'Ninguno' },
        { name: 'ℹ️ General', value: categories.general.join('\n') || 'Ninguno' }
      )
      .setFooter({ text: 'También puedes usar los comandos con el prefijo textual (por defecto >>).' });

    await interaction.reply({ embeds: [embed] });
  }

  public override async messageRun(message: Message, _args: Args) {
    const categories: Record<string, string[]> = {
      moderation: [],
      automod: [],
      settings: [],
      general: []
    };

    for (const cmd of this.store.values()) {
      const cat = cmd.fullCategory[0]?.toLowerCase() || 'general';
      if (categories[cat]) {
        categories[cat].push(`\`>>${cmd.name}\` - ${cmd.description}`);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🌀 Comandos de Vortex (Sapphire)')
      .setColor(0x3498db)
      .addFields(
        { name: '🛡️ Moderación', value: categories.moderation.join('\n') || 'Ninguno' },
        { name: '🤖 AutoMod', value: categories.automod.join('\n') || 'Ninguno' },
        { name: '⚙️ Configuración', value: categories.settings.join('\n') || 'Ninguno' },
        { name: 'ℹ️ General', value: categories.general.join('\n') || 'Ninguno' }
      );

    await message.reply({ embeds: [embed] });
  }
}
