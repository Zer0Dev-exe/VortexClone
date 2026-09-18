import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';

export class StrikeCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'strike',
      description: 'Asigna strikes a un usuario y ejecuta la sanción escalada correspondiente.',
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
      fullCategory: ['moderation']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a sancionar').setRequired(true))
        .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de strikes a agregar (por defecto 1)').setRequired(false))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('usuario', true);
    const amount = interaction.options.getInteger('cantidad') || 1;
    const reason = interaction.options.getString('motivo') || 'Sanción manual de moderación';
    const guild = interaction.guild!;

    try {
      const strikeHandler = this.container.autoMod.getStrikeHandler();
      const result = await strikeHandler.applyStrikes(guild, targetUser, interaction.user, amount, reason);
      let replyMsg = `🚩 Se han añadido **${amount}** strike(s) a **${targetUser.tag}**. Total acumulado: **${result.newStrikes}**.`;
      if (result.punishmentExecuted) {
        replyMsg += `\n⚡ Sanción escalada ejecutada: **${result.punishmentExecuted}**.`;
      }

      await interaction.reply({ content: replyMsg });
    } catch (err: any) {
      await interaction.reply({ content: `❌ Error al aplicar strike: ${err.message}`, ephemeral: true });
    }
  }

  public override async messageRun(message: Message, args: Args) {
    const targetUser = await args.pick('user').catch(async () => {
      const raw = await args.pick('string').catch(() => null);
      if (!raw) return null;
      return message.client.users.fetch(raw.replace(/[<@!>]/g, '')).catch(() => null);
    });

    if (!targetUser) {
      await message.reply('Uso: `>>strike <@usuario|id> [cantidad] [motivo]`');
      return;
    }

    let amount = await args.pick('integer').catch(() => 1);
    const reason = (await args.rest('string').catch(() => '')) || 'Sanción manual de moderación';
    const guild = message.guild!;

    try {
      const strikeHandler = this.container.autoMod.getStrikeHandler();
      const result = await strikeHandler.applyStrikes(guild, targetUser, message.author, amount, reason);

      let replyMsg = `🚩 Se han añadido **${amount}** strike(s) a **${targetUser.tag}**. Total acumulado: **${result.newStrikes}**.`;
      if (result.punishmentExecuted) {
        replyMsg += `\n⚡ Sanción escalada ejecutada: **${result.punishmentExecuted}**.`;
      }

      await message.reply(replyMsg);
    } catch (err: any) {
      await message.reply(`❌ Error: ${err.message}`);
    }
  }
}
