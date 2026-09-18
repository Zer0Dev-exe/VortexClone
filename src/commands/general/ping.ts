import {
  ChatInputCommandInteraction,
  Message,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';

export function createPingCommand(): Command {
  const slashData = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Comprueba la latencia del bot con Discord.');

  return {
    name: 'ping',
    description: 'Comprueba la latencia del bot.',
    category: 'general',
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const sent = await interaction.reply({ content: '🏓 Calculando ping...', fetchReply: true });
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      const wsLatency = interaction.client.ws.ping;

      await interaction.editReply(`🏓 Pong! Latencia de ida y vuelta: **${latency}ms**. Websocket API: **${wsLatency}ms**.`);
    },

    executePrefix: async (message: Message, args: string[]) => {
      const sent = await message.reply('🏓 Calculando ping...');
      const latency = sent.createdTimestamp - message.createdTimestamp;
      const wsLatency = message.client.ws.ping;

      await sent.edit(`🏓 Pong! Latencia: **${latency}ms**. Websocket: **${wsLatency}ms**.`);
    }
  };
}
