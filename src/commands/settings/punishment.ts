import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command, Action } from '../../types/index.js';
import { Database } from '../../database/Database.js';
import { parseDurationToSeconds, formatSeconds } from '../../utils/time.js';

export function createPunishmentCommand(db: Database): Command {
  const slashData = new SlashCommandBuilder()
    .setName('punishment')
    .setDescription('Configura la tabla de escalado automático de sanciones por strikes.')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Define la sanción al alcanzar un número específico de strikes')
        .addIntegerOption(opt => opt.setName('strikes').setDescription('Número de strikes acumulados').setMinValue(1).setRequired(true))
        .addStringOption(opt =>
          opt.setName('accion')
            .setDescription('Acción a ejecutar')
            .addChoices(
              { name: 'Advertir (WARN)', value: Action.WARN },
              { name: 'Silenciar Temporal (TEMPMUTE)', value: Action.TEMPMUTE },
              { name: 'Expulsar (KICK)', value: Action.KICK },
              { name: 'Softban (SOFTBAN)', value: Action.SOFTBAN },
              { name: 'Ban Temporal (TEMPBAN)', value: Action.TEMPBAN },
              { name: 'Ban Permanente (BAN)', value: Action.BAN }
            )
            .setRequired(true)
        )
        .addStringOption(opt => opt.setName('tiempo').setDescription('Tiempo para TEMPMUTE o TEMPBAN (ej. 1h, 1d)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Elimina la regla para un número de strikes')
        .addIntegerOption(opt => opt.setName('strikes').setDescription('Número de strikes').setMinValue(1).setRequired(true))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('Muestra la tabla actual de escalado de sanciones'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  return {
    name: 'punishment',
    description: 'Configura el escalado de sanciones automáticas por strikes.',
    category: 'settings',
    userPermissions: [PermissionFlagsBits.Administrator],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const sub = interaction.options.getSubcommand();
      const guildId = interaction.guild!.id;

      if (sub === 'set') {
        const strikes = interaction.options.getInteger('strikes', true);
        const action = interaction.options.getString('accion', true) as Action;
        const timeStr = interaction.options.getString('tiempo');
        const durationSeconds = timeStr ? parseDurationToSeconds(timeStr) || 0 : 0;

        await db.setPunishment(guildId, strikes, action, durationSeconds);
        await interaction.reply({
          content: `✅ Regla guardada: al alcanzar **${strikes} strike(s)** se ejecutará **${action}**${
            durationSeconds > 0 ? ` durante ${timeStr}` : ''
          }.`
        });
      } else if (sub === 'remove') {
        const strikes = interaction.options.getInteger('strikes', true);
        const removed = await db.removePunishment(guildId, strikes);
        await interaction.reply({
          content: removed ? `✅ Regla de sanción para ${strikes} strikes eliminada.` : `❌ No existía regla configurada para ${strikes} strikes.`
        });
      } else if (sub === 'list') {
        const rules = await db.getPunishments(guildId);
        if (rules.length === 0) {
          await interaction.reply({ content: 'ℹ️ No hay reglas de escalado configuradas aún.' });
          return;
        }

        const desc = rules
          .map(r => `• **${r.strike_count} strike(s)** ➔ **${r.action}** ${r.duration_seconds > 0 ? `(${formatSeconds(r.duration_seconds)})` : ''}`)
          .join('\n');

        const embed = new EmbedBuilder()
          .setTitle('⚖️ Tabla de Escalado de Sanciones (Vortex)')
          .setColor(0x9b59b6)
          .setDescription(desc);

        await interaction.reply({ embeds: [embed] });
      }
    },

    executePrefix: async (message: Message, args: string[]) => {
      const sub = args[0]?.toLowerCase();
      const guildId = message.guild!.id;

      if (sub === 'set' && args[1] && args[2]) {
        const strikes = parseInt(args[1], 10);
        const action = args[2].toUpperCase() as Action;
        const durationSeconds = args[3] ? parseDurationToSeconds(args[3]) || 0 : 0;

        await db.setPunishment(guildId, strikes, action, durationSeconds);
        await message.reply(`✅ Escalado guardado: ${strikes} strikes ➔ ${action}.`);
      } else if (sub === 'list') {
        const rules = await db.getPunishments(guildId);
        if (rules.length === 0) {
          await message.reply('ℹ️ No hay reglas de escalado configuradas.');
          return;
        }
        const desc = rules.map(r => `• **${r.strike_count} strikes**: ${r.action}`).join('\n');
        await message.reply(`⚖️ **Escalado de sanciones:**\n${desc}`);
      } else {
        await message.reply('Uso: `>>punishment <set|remove|list> <strikes> <accion> [tiempo]`');
      }
    }
  };
}
