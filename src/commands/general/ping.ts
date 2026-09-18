import { Command, Args } from '@sapphire/framework';
import { Message } from 'discord.js';

export class PingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'ping',
      description: 'Comprueba la latencia del bot con Discord.',
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
    const sent = await interaction.reply({ content: '🏓 Calculando ping...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = interaction.client.ws.ping;

    await interaction.editReply(`🏓 Pong! Latencia de ida y vuelta: **${latency}ms**. Websocket API: **${wsLatency}ms**.`);
  }

  public override async messageRun(message: Message, _args: Args) {
    const sent = await message.reply('🏓 Calculando ping...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const wsLatency = message.client.ws.ping;

    await sent.edit(`🏓 Pong! Latencia: **${latency}ms**. Websocket: **${wsLatency}ms**.`);
  }
}
