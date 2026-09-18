import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';

export function createAboutCommand(): Command {
  const slashData = new SlashCommandBuilder()
    .setName('about')
    .setDescription('Información sobre el bot Vortex Clone.');

  return {
    name: 'about',
    description: 'Información sobre el bot.',
    category: 'general',
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const client = interaction.client;
      const uptime = Math.floor(process.uptime());
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);

      const embed = new EmbedBuilder()
        .setTitle('🌀 Vortex (Clon en TypeScript & Discord.js)')
        .setColor(0x3498db)
        .setDescription(
          'Bot de moderación y seguridad integral inspirado en **jagrosh/Vortex**, reimplementado en TypeScript y Discord.js v14 sin dependencias de Java ni sobrecarga de sharding.'
        )
        .addFields(
          { name: '🌐 Servidores', value: `${client.guilds.cache.size}`, inline: true },
          { name: '👥 Usuarios en caché', value: `${client.users.cache.size}`, inline: true },
          { name: '⏱️ Tiempo activo', value: `${hours}h ${minutes}m`, inline: true },
          { name: '⚙️ Runtime', value: `Node.js ${process.version}`, inline: true },
          { name: '📦 Librería', value: 'Discord.js v14', inline: true },
          { name: '💾 Base de Datos', value: 'SQLite (better-sqlite3)', inline: true }
        )
        .setFooter({ text: 'Inspirado en el trabajo original de John Grosh (jagrosh)' });

      await interaction.reply({ embeds: [embed] });
    },

    executePrefix: async (message: Message, args: string[]) => {
      const client = message.client;
      const embed = new EmbedBuilder()
        .setTitle('🌀 Vortex')
        .setColor(0x3498db)
        .setDescription('Bot de moderación avanzado. Escribe `/help` o `>>help` para ver comandos.');

      await message.reply({ embeds: [embed] });
    }
  };
}
