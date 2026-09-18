import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';

export class ReasonCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'reason',
      description: 'Modifica el motivo de un caso de moderación existente.',
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
      fullCategory: ['moderation']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addIntegerOption(opt => opt.setName('caso').setDescription('Número del caso a actualizar').setRequired(true))
        .addStringOption(opt => opt.setName('nuevo_motivo').setDescription('El nuevo motivo').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const caseNumber = interaction.options.getInteger('caso', true);
    const newReason = interaction.options.getString('nuevo_motivo', true);
    const guild = interaction.guild!;

    const success = await this.container.modLogger.updateCaseReason(guild.id, caseNumber, newReason);
    if (success) {
      await interaction.reply({ content: `✅ Motivo del caso **#${caseNumber}** actualizado correctamente a: "${newReason}".` });
    } else {
      await interaction.reply({ content: `❌ No se encontró ningún caso con el número **#${caseNumber}** en este servidor.`, ephemeral: true });
    }
  }

  public override async messageRun(message: Message, args: Args) {
    const caseNumber = await args.pick('integer').catch(() => null);
    const newReason = await args.rest('string').catch(() => null);

    if (!caseNumber || !newReason) {
      await message.reply('Uso: `>>reason <número_caso> <nuevo_motivo>`');
      return;
    }

    const guild = message.guild!;
    const success = await this.container.modLogger.updateCaseReason(guild.id, caseNumber, newReason);
    if (success) {
      await message.reply(`✅ Motivo del caso **#${caseNumber}** actualizado.`);
    } else {
      await message.reply(`❌ No se encontró el caso **#${caseNumber}**.`);
    }
  }
}
