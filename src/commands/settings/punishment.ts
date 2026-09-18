import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message, EmbedBuilder } from 'discord.js';
import { Action } from '../../types/index.js';
import { parseDurationToSeconds, formatSeconds } from '../../utils/time.js';

export class PunishmentCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'punishment',
      description: 'Configura la tabla de escalado automático de sanciones por strikes.',
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
      fullCategory: ['settings']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
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
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild!.id;

    if (sub === 'set') {
      const strikes = interaction.options.getInteger('strikes', true);
      const action = interaction.options.getString('accion', true) as Action;
      const timeStr = interaction.options.getString('tiempo');
      const durationSeconds = timeStr ? parseDurationToSeconds(timeStr) || 0 : 0;

      await this.container.db.setPunishment(guildId, strikes, action, durationSeconds);
      await interaction.reply({
        content: `✅ Regla guardada: al alcanzar **${strikes} strike(s)** se ejecutará **${action}**${
          durationSeconds > 0 ? ` durante ${timeStr}` : ''
        }.`
      });
    } else if (sub === 'remove') {
      const strikes = interaction.options.getInteger('strikes', true);
      const removed = await this.container.db.removePunishment(guildId, strikes);
      await interaction.reply({
        content: removed ? `✅ Regla de sanción para ${strikes} strikes eliminada.` : `❌ No existía regla configurada para ${strikes} strikes.`
      });
    } else if (sub === 'list') {
      const rules = await this.container.db.getPunishments(guildId);
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
  }

  public override async messageRun(message: Message, args: Args) {
    const sub = (await args.pick('string').catch(() => null))?.toLowerCase();
    const guildId = message.guild!.id;

    if (sub === 'set') {
      const strikes = await args.pick('integer').catch(() => null);
      const actionStr = (await args.pick('string').catch(() => null))?.toUpperCase();
      const timeStr = await args.pick('string').catch(() => null);

      if (!strikes || !actionStr || !(actionStr in Action)) {
        await message.reply('Uso: `>>punishment set <strikes> <WARN|TEMPMUTE|KICK|SOFTBAN|TEMPBAN|BAN> [tiempo]`');
        return;
      }

      const action = actionStr as Action;
      const durationSeconds = timeStr ? parseDurationToSeconds(timeStr) || 0 : 0;

      await this.container.db.setPunishment(guildId, strikes, action, durationSeconds);
      await message.reply(`✅ Escalado guardado: ${strikes} strikes ➔ ${action}.`);
    } else if (sub === 'remove') {
      const strikes = await args.pick('integer').catch(() => null);
      if (!strikes) {
        await message.reply('Uso: `>>punishment remove <strikes>`');
        return;
      }

      const removed = await this.container.db.removePunishment(guildId, strikes);
      await message.reply(removed ? `✅ Regla eliminada.` : `❌ No existía regla para ${strikes} strikes.`);
    } else if (sub === 'list') {
      const rules = await this.container.db.getPunishments(guildId);
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
}
