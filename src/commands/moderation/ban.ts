import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';
import { Action } from '../../types/index.js';
import { parseDurationToSeconds } from '../../utils/time.js';

export class BanCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'ban',
      description: 'Banea a un usuario del servidor (con opción de tiempo temporal).',
      requiredUserPermissions: [PermissionFlagsBits.BanMembers],
      requiredClientPermissions: [PermissionFlagsBits.BanMembers],
      fullCategory: ['moderation']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a banear').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo de la sanción').setRequired(false))
        .addStringOption(opt => opt.setName('tiempo').setDescription('Tiempo temporal (ej. 1h, 1d, 7d)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo') || 'Sin motivo especificado';
    const timeStr = interaction.options.getString('tiempo');
    const durationSeconds = timeStr ? parseDurationToSeconds(timeStr) : null;
    const guild = interaction.guild!;

    try {
      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (member && !member.bannable) {
        await interaction.reply({ content: '❌ No puedo banear a este usuario (su rol es superior o igual al mío).', ephemeral: true });
        return;
      }

      try {
        await targetUser.send(`🔨 Has sido baneado de **${guild.name}**. Motivo: ${reason}`);
      } catch {}

      await guild.bans.create(targetUser.id, { deleteMessageSeconds: 86400, reason });

      const action = durationSeconds ? Action.TEMPBAN : Action.BAN;
      if (durationSeconds) {
        await this.container.db.addTempPunishment(guild.id, targetUser.id, Action.TEMPBAN, durationSeconds);
      }

      await this.container.modLogger.postCase(
        guild.id,
        targetUser,
        interaction.user,
        action,
        `${reason}${durationSeconds ? ` (Temporal: ${timeStr})` : ''}`
      );

      await interaction.reply({
        content: `✅ **${targetUser.tag}** ha sido ${action === Action.TEMPBAN ? `baneado temporalmente por ${timeStr}` : 'baneado permanentemente'}.`
      });
    } catch (err: any) {
      await interaction.reply({ content: `❌ Error al banear: ${err.message}`, ephemeral: true });
    }
  }

  public override async messageRun(message: Message, args: Args) {
    const targetUser = await args.pick('user').catch(async () => {
      const raw = await args.pick('string').catch(() => null);
      if (!raw) return null;
      return message.client.users.fetch(raw.replace(/[<@!>]/g, '')).catch(() => null);
    });

    if (!targetUser) {
      await message.reply('Uso: `>>ban <@usuario|id> [tiempo] [motivo]`');
      return;
    }

    const guild = message.guild!;
    const nextArg = await args.pick('string').catch(() => null);
    let durationSeconds: number | null = null;
    let timeStr: string | null = null;
    const reasonArgs: string[] = [];

    if (nextArg) {
      const parsed = parseDurationToSeconds(nextArg);
      if (parsed !== null) {
        durationSeconds = parsed;
        timeStr = nextArg;
      } else {
        reasonArgs.push(nextArg);
      }
    }

    const restReason = await args.rest('string').catch(() => '');
    if (restReason) reasonArgs.push(restReason);
    const reason = reasonArgs.join(' ') || 'Sin motivo especificado';

    try {
      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (member && !member.bannable) {
        await message.reply('❌ No puedo banear a este usuario (su rol es superior o igual al mío).');
        return;
      }

      try {
        await targetUser.send(`🔨 Has sido baneado de **${guild.name}**. Motivo: ${reason}`);
      } catch {}

      await guild.bans.create(targetUser.id, { deleteMessageSeconds: 86400, reason });

      const action = durationSeconds ? Action.TEMPBAN : Action.BAN;
      if (durationSeconds) {
        await this.container.db.addTempPunishment(guild.id, targetUser.id, Action.TEMPBAN, durationSeconds);
      }

      await this.container.modLogger.postCase(
        guild.id,
        targetUser,
        message.author,
        action,
        `${reason}${durationSeconds ? ` (Temporal: ${timeStr})` : ''}`
      );

      await message.reply(`✅ **${targetUser.tag}** ha sido baneado.`);
    } catch (err: any) {
      await message.reply(`❌ Error: ${err.message}`);
    }
  }
}
