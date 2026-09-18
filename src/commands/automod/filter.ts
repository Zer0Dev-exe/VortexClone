import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';
import { Database } from '../../database/Database.js';

export function createFilterCommand(db: Database): Command {
  const slashData = new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Administra filtros de palabras o expresiones regulares prohibidas.')
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
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  return {
    name: 'filter',
    description: 'Administra filtros de palabras prohibidas.',
    category: 'automod',
    userPermissions: [PermissionFlagsBits.ManageGuild],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
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

        const id = await db.addFilter(guildId, pattern, isRegex, strikes);
        await interaction.reply({ content: `✅ Filtro agregado (#${id}): "${pattern}" (${isRegex ? 'Regex' : 'Texto plano'}, ${strikes} strike(s)).` });
      } else if (sub === 'remove') {
        const filterStr = interaction.options.getString('filtro', true);
        const removed = await db.removeFilter(guildId, filterStr);
        if (removed) {
          await interaction.reply({ content: `✅ Filtro "${filterStr}" eliminado.` });
        } else {
          await interaction.reply({ content: `❌ No se encontró ningún filtro con "${filterStr}".`, ephemeral: true });
        }
      } else if (sub === 'list') {
        const filters = await db.getFilters(guildId);
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
    },

    executePrefix: async (message: Message, args: string[]) => {
      const guildId = message.guild!.id;
      const sub = args[0]?.toLowerCase();

      if (sub === 'add' && args[1]) {
        const pattern = args.slice(1).join(' ');
        const id = await db.addFilter(guildId, pattern, false, 1);
        await message.reply(`✅ Filtro agregado (#${id}): "${pattern}"`);
      } else if (sub === 'remove' && args[1]) {
        const removed = await db.removeFilter(guildId, args[1]);
        await message.reply(removed ? `✅ Filtro eliminado.` : `❌ Filtro no encontrado.`);
      } else if (sub === 'list') {
        const filters = await db.getFilters(guildId);
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
  };
}
