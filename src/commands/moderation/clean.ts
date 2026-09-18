import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message, TextChannel } from 'discord.js';
import { Action } from '../../types/index.js';

export class CleanCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'clean',
      description: 'Elimina mensajes en masa con filtros opcionales.',
      requiredUserPermissions: [PermissionFlagsBits.ManageMessages],
      requiredClientPermissions: [PermissionFlagsBits.ManageMessages],
      fullCategory: ['moderation']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addIntegerOption(opt =>
          opt.setName('cantidad')
            .setDescription('Número de mensajes a revisar/eliminar (máximo 100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('filtro')
            .setDescription('Filtro a aplicar')
            .addChoices(
              { name: 'Todos (all)', value: 'all' },
              { name: 'Solo Bots (bots)', value: 'bots' },
              { name: 'Solo Enlaces (links)', value: 'links' }
            )
            .setRequired(false)
        )
        .addUserOption(opt => opt.setName('usuario').setDescription('Solo mensajes de este usuario').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('cantidad', true);
    const filter = interaction.options.getString('filtro') || 'all';
    const targetUser = interaction.options.getUser('usuario');
    const channel = interaction.channel;

    if (!channel || !(channel instanceof TextChannel)) {
      await interaction.reply({ content: '❌ Este comando solo puede usarse en canales de texto.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const fetched = await channel.messages.fetch({ limit: amount });
      const toDelete = fetched.filter(msg => {
        if (targetUser && msg.author.id !== targetUser.id) return false;
        if (filter === 'bots' && !msg.author.bot) return false;
        if (filter === 'links' && !/https?:\/\/\S+/i.test(msg.content)) return false;
        return true;
      });

      const deleted = await channel.bulkDelete(toDelete, true);
      await this.container.modLogger.postCase(
        interaction.guild!.id,
        targetUser || { id: '0', tag: `Filtro: ${filter}` },
        interaction.user,
        Action.CLEAN,
        `Limpieza de ${deleted.size} mensaje(s) en #${channel.name}`
      );

      await interaction.editReply({ content: `🗑️ Se han eliminado **${deleted.size}** mensaje(s) correctamente.` });
    } catch (err: any) {
      await interaction.editReply({ content: `❌ Error al limpiar mensajes: ${err.message}` });
    }
  }

  public override async messageRun(message: Message, args: Args) {
    const amountNum = await args.pick('integer').catch(() => null);
    if (!amountNum) {
      await message.reply('Uso: `>>clean <cantidad: 1-100> [bots|links|@usuario]`');
      return;
    }

    const amount = Math.min(100, Math.max(1, amountNum));
    const channel = message.channel;
    if (!(channel instanceof TextChannel)) return;

    const mention = message.mentions.users.first();
    const filter = (await args.pick('string').catch(() => 'all')).toLowerCase();

    try {
      await message.delete().catch(() => {});
      const fetched = await channel.messages.fetch({ limit: amount });
      const toDelete = fetched.filter(msg => {
        if (mention && msg.author.id !== mention.id) return false;
        if (filter === 'bots' && !msg.author.bot) return false;
        if (filter === 'links' && !/https?:\/\/\S+/i.test(msg.content)) return false;
        return true;
      });

      const deleted = await channel.bulkDelete(toDelete, true);
      const confirmation = await channel.send(`🗑️ Se han eliminado **${deleted.size}** mensaje(s).`);
      setTimeout(() => confirmation.delete().catch(() => {}), 3000);
    } catch (err: any) {
      await channel.send(`❌ Error: ${err.message}`);
    }
  }
}
