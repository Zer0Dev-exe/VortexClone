import { Command, Args } from '@sapphire/framework';
import { PermissionFlagsBits, Message } from 'discord.js';

export class WhitelistCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'whitelist',
      description: 'Administra la lista de invitaciones/servidores permitidos en el filtro anti-invitaciones.',
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      fullCategory: ['automod']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Agrega un código de invitación o ID de servidor a la lista blanca')
            .addStringOption(opt => opt.setName('codigo_o_id').setDescription('Código de invite o ID de servidor').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remueve un código o ID de la lista blanca')
            .addStringOption(opt => opt.setName('codigo_o_id').setDescription('Código o ID a remover').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('list').setDescription('Muestra los elementos en la lista blanca'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild!.id;

    if (sub === 'add') {
      const target = interaction.options.getString('codigo_o_id', true);
      await this.container.db.addInviteWhitelist(guildId, target);
      await interaction.reply({ content: `✅ Agregado a la lista blanca: \`${target}\`.` });
    } else if (sub === 'remove') {
      const target = interaction.options.getString('codigo_o_id', true);
      const removed = await this.container.db.removeInviteWhitelist(guildId, target);
      await interaction.reply({ content: removed ? `✅ Removido de la lista blanca: \`${target}\`.` : `❌ No estaba en la lista blanca.` });
    } else if (sub === 'list') {
      const list = await this.container.db.getInviteWhitelist(guildId);
      if (list.length === 0) {
        await interaction.reply({ content: 'ℹ️ No hay invitaciones ni servidores en la lista blanca.' });
        return;
      }
      await interaction.reply({ content: `📋 **Lista blanca de invitaciones:**\n${list.map(i => `• \`${i}\``).join('\n')}` });
    }
  }

  public override async messageRun(message: Message, args: Args) {
    const guildId = message.guild!.id;
    const sub = (await args.pick('string').catch(() => null))?.toLowerCase();

    if (sub === 'add') {
      const target = await args.pick('string').catch(() => null);
      if (!target) {
        await message.reply('Uso: `>>whitelist add <código_o_id>`');
        return;
      }
      await this.container.db.addInviteWhitelist(guildId, target);
      await message.reply(`✅ Agregado a la lista blanca: \`${target}\`.`);
    } else if (sub === 'remove') {
      const target = await args.pick('string').catch(() => null);
      if (!target) {
        await message.reply('Uso: `>>whitelist remove <código_o_id>`');
        return;
      }
      const removed = await this.container.db.removeInviteWhitelist(guildId, target);
      await message.reply(removed ? `✅ Removido de la lista blanca.` : `❌ No encontrado.`);
    } else if (sub === 'list') {
      const list = await this.container.db.getInviteWhitelist(guildId);
      await message.reply(list.length > 0 ? `📋 **Lista blanca:**\n${list.map(i => `• \`${i}\``).join('\n')}` : 'ℹ️ Lista blanca vacía.');
    } else {
      await message.reply('Uso: `>>whitelist <add|remove|list> <código_o_id>`');
    }
  }
}
