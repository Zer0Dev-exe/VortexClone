import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message, EmbedBuilder } from 'discord.js';

export class FilterCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'filter',
      description: 'Administra filtros de palabras o expresiones regulares prohibidas.',
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      fullCategory: ['automod']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Agrega una palabra o patrón')
            .addStringOption(opt => opt.setName('patron').setDescription('Texto o regex').setRequired(true))
            .addBooleanOption(opt => opt.setName('es_regex').setDescription('¿Es expresión regular?').setRequired(false))
            .addIntegerOption(opt => opt.setName('strikes').setDescription('Strikes a asignar (defecto 1)').setRequired(false))
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Elimina un filtro por su ID o patrón')
            .addStringOption(opt => opt.setName('filtro').setDescription('ID numérico o texto exacto').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('list').setDescription('Lista todos los filtros del servidor'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild!.id;

    if (sub === 'add') {
      const pattern = interaction.options.getString('patron', true);
      const isRegex = interaction.options.getBoolean('es_regex') || false;
      const strikes = interaction.options.getInteger('strikes') || 1;

      if (isRegex) {
        try {
          new RegExp(pattern);
        } catch {
          await interaction.reply({ content: '❌ Expresión regular inválida.', ephemeral: true });
          return;
        }
      }

      const id = await this.container.db.addFilter(guildId, pattern, isRegex, strikes);
      await interaction.reply({ content: `✅ Filtro agregado (#${id}): "${pattern}" (${isRegex ? 'Regex' : 'Texto plano'}, ${strikes} strike(s)).` });
    } else if (sub === 'remove') {
      const filterStr = interaction.options.getString('filtro', true);
      const removed = await this.container.db.removeFilter(guildId, filterStr);
      if (removed) {
        await interaction.reply({ content: `✅ Filtro "${filterStr}" eliminado.` });
      } else {
        await interaction.reply({ content: `❌ No se encontró ningún filtro con "${filterStr}".`, ephemeral: true });
      }
    } else if (sub === 'list') {
      const filters = await this.container.db.getFilters(guildId);
      if (filters.length === 0) {
        await interaction.reply({ content: 'ℹ️ No hay filtros activos configurados.' });
        return;
      }

      const list = filters.map(f => `• **#${f.id}** [${f.is_regex ? 'Regex' : 'Texto'}]: \`${f.pattern}\` (${f.strikes} strike(s))`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle(`Filtros de moderación (${filters.length})`)
        .setColor(0x3498db)
        .setDescription(list);

      await interaction.reply({ embeds: [embed] });
    }
  }

  public override async messageRun(message: Message, args: Args) {
    const guildId = message.guild!.id;
    const sub = (await args.pick('string').catch(() => null))?.toLowerCase();

    if (sub === 'add') {
      const pattern = await args.rest('string').catch(() => null);
      if (!pattern) {
        await message.reply('Uso: `>>filter add <palabra o regex>`');
        return;
      }
      const id = await this.container.db.addFilter(guildId, pattern, false, 1);
      await message.reply(`✅ Filtro agregado (#${id}): "${pattern}"`);
    } else if (sub === 'remove') {
      const filterTarget = await args.rest('string').catch(() => null);
      if (!filterTarget) {
        await message.reply('Uso: `>>filter remove <id o texto>`');
        return;
      }
      const removed = await this.container.db.removeFilter(guildId, filterTarget);
      await message.reply(removed ? `✅ Filtro eliminado.` : `❌ Filtro no encontrado.`);
    } else if (sub === 'list') {
      const filters = await this.container.db.getFilters(guildId);
      if (filters.length === 0) {
        await message.reply('ℹ️ No hay filtros activos.');
        return;
      }
      const list = filters.map(f => `• **#${f.id}**: \`${f.pattern}\``).join('\n');
      await message.reply(`📋 **Filtros:**\n${list}`);
    } else {
      await message.reply('Uso: `>>filter <add|remove|list> [patrón]`');
    }
  }
}
