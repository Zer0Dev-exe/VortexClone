import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message, EmbedBuilder } from 'discord.js';

export class CheckCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'check',
      description: 'Inspecciona el historial de moderación, strikes y detalles de un usuario.',
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
      fullCategory: ['moderation']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('usuario', true);
    const guild = interaction.guild!;

    const strikes = await this.container.db.getStrikes(guild.id, targetUser.id);
    const cases = await this.container.db.getUserCases(guild.id, targetUser.id, 5);
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
  }

  public override async messageRun(message: Message, args: Args) {
    const targetUser = await args.pick('user').catch(async () => {
      const raw = await args.pick('string').catch(() => null);
      if (!raw) return message.author;
      return message.client.users.fetch(raw.replace(/[<@!>]/g, '')).catch(() => message.author);
    });

    const guild = message.guild!;

    try {
      const strikes = await this.container.db.getStrikes(guild.id, targetUser.id);
      const cases = await this.container.db.getUserCases(guild.id, targetUser.id, 5);

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
}
