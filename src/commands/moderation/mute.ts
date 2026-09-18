import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';
import { Action } from '../../types/index.js';
import { parseDurationToSeconds } from '../../utils/time.js';

export class MuteCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'mute',
      description: 'Silencia a un miembro (timeout nativo y/o rol Muted).',
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
      requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
      fullCategory: ['moderation']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a silenciar').setRequired(true))
        .addStringOption(opt => opt.setName('tiempo').setDescription('Duración del silencio (ej. 10m, 1h, 1d)').setRequired(false))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('usuario', true);
    const timeStr = interaction.options.getString('tiempo');
    const reason = interaction.options.getString('motivo') || 'Sin motivo especificado';
    const durationSeconds = timeStr ? parseDurationToSeconds(timeStr) : 3600;
    const guild = interaction.guild!;

    try {
      const member = await guild.members.fetch(targetUser.id);
      if (!member.moderatable) {
        await interaction.reply({ content: '❌ No puedo silenciar a este miembro (jerarquía de roles superior o igual).', ephemeral: true });
        return;
      }

      if (durationSeconds && durationSeconds <= 2419200) {
        await member.timeout(durationSeconds * 1000, reason);
      }

      const settings = await this.container.db.getGuildSettings(guild.id);
      if (settings.mute_role_id) {
        const role = guild.roles.cache.get(settings.mute_role_id);
        if (role) await member.roles.add(role, reason);
      }

      if (durationSeconds) {
        await this.container.db.addTempPunishment(guild.id, targetUser.id, Action.TEMPMUTE, durationSeconds);
      }

      await this.container.modLogger.postCase(
        guild.id,
        targetUser,
        interaction.user,
        Action.TEMPMUTE,
        `${reason} (Duración: ${timeStr || '1h'})`
      );

      await interaction.reply({ content: `🔇 **${targetUser.tag}** ha sido silenciado por **${timeStr || '1h'}**.` });
    } catch (err: any) {
      await interaction.reply({ content: `❌ Error al silenciar: ${err.message}`, ephemeral: true });
    }
  }

  public override async messageRun(message: Message, args: Args) {
    const member = await args.pick('member').catch(async () => {
      const raw = await args.pick('string').catch(() => null);
      if (!raw) return null;
      return message.guild?.members.fetch(raw.replace(/[<@!>]/g, '')).catch(() => null);
    });

    if (!member) {
      await message.reply('Uso: `>>mute <@usuario|id> [tiempo] [motivo]`');
      return;
    }

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

    const finalDuration = durationSeconds || 3600;
    const restReason = await args.rest('string').catch(() => '');
    if (restReason) reasonArgs.push(restReason);
    const reason = reasonArgs.join(' ') || 'Sin motivo especificado';
    const guild = message.guild!;

    try {
      if (!member.moderatable) {
        await message.reply('❌ No puedo silenciar a este miembro.');
        return;
      }

      if (finalDuration <= 2419200) {
        await member.timeout(finalDuration * 1000, reason);
      }

      const settings = await this.container.db.getGuildSettings(guild.id);
      if (settings.mute_role_id) {
        const role = guild.roles.cache.get(settings.mute_role_id);
        if (role) await member.roles.add(role, reason);
      }

      await this.container.db.addTempPunishment(guild.id, member.id, Action.TEMPMUTE, finalDuration);
      await this.container.modLogger.postCase(
        guild.id,
        member.user,
        message.author,
        Action.TEMPMUTE,
        `${reason} (Duración: ${timeStr || '1h'})`
      );

      await message.reply(`🔇 **${member.user.tag}** ha sido silenciado por **${timeStr || '1h'}**.`);
    } catch (err: any) {
      await message.reply(`❌ Error: ${err.message}`);
    }
  }
}
