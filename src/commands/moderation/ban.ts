import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command, Action } from '../../types/index.js';
import { Database } from '../../database/Database.js';
import { ModLogger } from '../../logging/ModLogger.js';
import { parseDurationToSeconds } from '../../utils/time.js';

export function createBanCommand(db: Database, modLogger: ModLogger): Command {
  const slashData = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banea a un usuario del servidor (con opción de tiempo temporal).')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a banear').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo de la sanción').setRequired(false))
    .addStringOption(opt => opt.setName('tiempo').setDescription('Tiempo temporal (ej. 1h, 1d, 7d)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

  return {
    name: 'ban',
    description: 'Banea a un usuario del servidor.',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const targetUser = interaction.options.getUser('usuario', true);
      const reason = interaction.options.getString('motivo') || 'Sin motivo especificado';
      const timeStr = interaction.options.getString('tiempo');
      const durationSeconds = timeStr ? parseDurationToSeconds(timeStr) : null;

      const guild = interaction.guild!;
      if (!interaction.guild?.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
        await interaction.reply({ content: '❌ No tengo permisos suficientes para banear miembros.', ephemeral: true });
        return;
      }

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
          await db.addTempPunishment(guild.id, targetUser.id, Action.TEMPBAN, durationSeconds);
        }

        await modLogger.postCase(
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
    },

    executePrefix: async (message: Message, args: string[]) => {
      if (!args[0]) {
        await message.reply('Uso: `>>ban <@usuario|id> [tiempo] [motivo]`');
        return;
      }

      const guild = message.guild!;
      const mention = message.mentions.users.first();
      const userId = mention ? mention.id : args[0].replace(/[<@!>]/g, '');

      try {
        const targetUser = await message.client.users.fetch(userId);
        let remainingArgs = args.slice(1);
        let durationSeconds: number | null = null;
        let timeStr: string | null = null;

        if (remainingArgs.length > 0) {
          const parsed = parseDurationToSeconds(remainingArgs[0]);
          if (parsed !== null) {
            durationSeconds = parsed;
            timeStr = remainingArgs[0];
            remainingArgs = remainingArgs.slice(1);
          }
        }

        const reason = remainingArgs.join(' ') || 'Sin motivo especificado';

        try {
          await targetUser.send(`🔨 Has sido baneado de **${guild.name}**. Motivo: ${reason}`);
        } catch {}

        await guild.bans.create(targetUser.id, { deleteMessageSeconds: 86400, reason });

        const action = durationSeconds ? Action.TEMPBAN : Action.BAN;
        if (durationSeconds) {
          await db.addTempPunishment(guild.id, targetUser.id, Action.TEMPBAN, durationSeconds);
        }

        await modLogger.postCase(
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
  };
}
