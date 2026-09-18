import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';
import { Database } from '../../database/Database.js';

export function createCheckCommand(db: Database): Command {
  const slashData = new SlashCommandBuilder()
    .setName('check')
    .setDescription('Inspecciona el historial de moderación, strikes y detalles de un usuario.')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

  return {
    name: 'check',
    description: 'Inspecciona el historial y strikes de un usuario.',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.ModerateMembers],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const targetUser = interaction.options.getUser('usuario', true);
      const guild = interaction.guild!;

      const strikes = await db.getStrikes(guild.id, targetUser.id);
      const cases = await db.getUserCases(guild.id, targetUser.id, 5);
      const member = await guild.members.fetch(targetUser.id).catch(() => null);

      const createdTimestamp = Math.floor(targetUser.createdTimestamp / 1000);
      const joinedTimestamp = member?.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;

      const embed = new EmbedBuilder()
        .setColor(strikes > 0 ? 0xe74c3c : 0x2ecc71)
        .setAuthor({ name: `Información de moderación: ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL() })
        .addFields(
          { name: '🆔 ID', value: targetUser.id, inline: true },
          { name: '🚩 Strikes Activos', value: `**${strikes}**`, inline: true },
          { name: '📅 Cuenta creada', value: `<t:${createdTimestamp}:D> (<t:${createdTimestamp}:R>)`, inline: false }
        );

      if (joinedTimestamp) {
        embed.addFields({ name: '📥 Ingreso al servidor', value: `<t:${joinedTimestamp}:D> (<t:${joinedTimestamp}:R>)`, inline: false });
      }

      if (member) {
        const roles = member.roles.cache
          .filter(r => r.id !== guild.id)
          .map(r => `<@&${r.id}>`)
          .join(', ');
        embed.addFields({ name: '🎭 Roles', value: roles || 'Ninguno' });
      }

      if (cases.length > 0) {
        const caseList = cases
          .map(c => `• **#${c.case_number}** [${c.action}] por <@${c.moderator_id}>: ${c.reason}`)
          .join('\n');
        embed.addFields({ name: `📋 Últimos ${cases.length} caso(s)`, value: caseList });
      } else {
        embed.addFields({ name: '📋 Historial de casos', value: '*Sin sanciones registradas.*' });
      }

      await interaction.reply({ embeds: [embed] });
    },

    executePrefix: async (message: Message, args: string[]) => {
      const mention = message.mentions.users.first();
      const userId = mention ? mention.id : args[0]?.replace(/[<@!>]/g, '') || message.author.id;
      const guild = message.guild!;

      try {
        const targetUser = await message.client.users.fetch(userId);
        const strikes = await db.getStrikes(guild.id, targetUser.id);
        const cases = await db.getUserCases(guild.id, targetUser.id, 5);
        const member = await guild.members.fetch(targetUser.id).catch(() => null);

        const createdTimestamp = Math.floor(targetUser.createdTimestamp / 1000);
        const embed = new EmbedBuilder()
          .setColor(strikes > 0 ? 0xe74c3c : 0x2ecc71)
          .setAuthor({ name: `Moderación: ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL() })
          .addFields(
            { name: '🆔 ID', value: targetUser.id, inline: true },
            { name: '🚩 Strikes', value: `**${strikes}**`, inline: true },
            { name: '📅 Creación', value: `<t:${createdTimestamp}:R>`, inline: true }
          );

        if (cases.length > 0) {
          const caseList = cases.map(c => `• **#${c.case_number}** [${c.action}]: ${c.reason}`).join('\n');
          embed.addFields({ name: 'Últimos casos', value: caseList });
        }

        await message.reply({ embeds: [embed] });
      } catch (err: any) {
        await message.reply(`❌ Error: ${err.message}`);
      }
    }
  };
}
