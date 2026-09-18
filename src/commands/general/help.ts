import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';

export function createHelpCommand(commands: Map<string, Command>): Command {
  const slashData = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra la lista de comandos disponibles en Vortex.');

  return {
    name: 'help',
    description: 'Muestra la lista de comandos.',
    category: 'general',
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const categories: Record<string, string[]> = {
        moderation: [],
        automod: [],
        settings: [],
        general: []
      };

      for (const cmd of commands.values()) {
        if (categories[cmd.category]) {
          categories[cmd.category].push(`\`/${cmd.name}\` - ${cmd.description}`);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('🌀 Guía de Comandos de Vortex')
        .setColor(0x3498db)
        .addFields(
          { name: '🛡️ Moderación', value: categories.moderation.join('\n') || 'Ninguno' },
          { name: '🤖 AutoMod', value: categories.automod.join('\n') || 'Ninguno' },
          { name: '⚙️ Configuración', value: categories.settings.join('\n') || 'Ninguno' },
          { name: 'ℹ️ General', value: categories.general.join('\n') || 'Ninguno' }
        )
        .setFooter({ text: 'También puedes usar los comandos con el prefijo textual (por defecto >>).' });

      await interaction.reply({ embeds: [embed] });
    },

    executePrefix: async (message: Message, args: string[]) => {
      const categories: Record<string, string[]> = {
        moderation: [],
        automod: [],
        settings: [],
        general: []
      };

      for (const cmd of commands.values()) {
        if (categories[cmd.category]) {
          categories[cmd.category].push(`\`>>${cmd.name}\` - ${cmd.description}`);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('🌀 Comandos de Vortex')
        .setColor(0x3498db)
        .addFields(
          { name: '🛡️ Moderación', value: categories.moderation.join('\n') },
          { name: '🤖 AutoMod', value: categories.automod.join('\n') },
          { name: '⚙️ Configuración', value: categories.settings.join('\n') },
          { name: 'ℹ️ General', value: categories.general.join('\n') }
        );

      await message.reply({ embeds: [embed] });
    }
  };
}
