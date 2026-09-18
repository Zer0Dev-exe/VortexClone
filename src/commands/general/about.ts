import { Command, Args } from '@sapphire/framework';
import { EmbedBuilder, Message } from 'discord.js';

export class AboutCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'about',
      description: 'Información sobre el bot Vortex Clone.',
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
    const client = interaction.client;
    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const embed = new EmbedBuilder()
      .setTitle('🌀 Vortex (Sapphire & Discord.js v14)')
      .setColor(0x3498db)
      .setDescription(
        'Bot de moderación y seguridad integral inspirado en **jagrosh/Vortex**, reimplementado con arquitectura moderna en **Sapphire Framework**, TypeScript y Discord.js v14.'
      )
      .addFields(
        { name: '🌐 Servidores', value: `${client.guilds.cache.size}`, inline: true },
        { name: '👥 Usuarios en caché', value: `${client.users.cache.size}`, inline: true },
        { name: '⏱️ Tiempo activo', value: `${hours}h ${minutes}m`, inline: true },
        { name: '⚙️ Runtime', value: `Node.js ${process.version}`, inline: true },
        { name: '💎 Framework', value: 'Sapphire Framework v5', inline: true },
        { name: '🍃 Base de Datos', value: 'MongoDB Atlas Cloud', inline: true }
      )
      .setFooter({ text: 'Inspirado en el trabajo original de John Grosh (jagrosh)' });

    await interaction.reply({ embeds: [embed] });
  }

  public override async messageRun(message: Message, _args: Args) {
    const client = message.client;
    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const embed = new EmbedBuilder()
      .setTitle('🌀 Vortex (Sapphire Framework)')
      .setColor(0x3498db)
      .setDescription(
        'Bot de moderación y seguridad integral inspirado en **jagrosh/Vortex**, reimplementado en **TypeScript & Sapphire Framework**.'
      )
      .addFields(
        { name: '🌐 Servidores', value: `${client.guilds.cache.size}`, inline: true },
        { name: '⏱️ Tiempo activo', value: `${hours}h ${minutes}m`, inline: true },
        { name: '🍃 Base de Datos', value: 'MongoDB Atlas', inline: true }
      )
      .setFooter({ text: 'Escribe /help o >>help para ver la lista de comandos.' });

    await message.reply({ embeds: [embed] });
  }
}
