import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';
import { Database } from '../../database/Database.js';

export function createWhitelistCommand(db: Database): Command {
  const slashData = new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Administra la lista de invitaciones/servidores permitidos en el filtro anti-invitaciones.')
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
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  return {
    name: 'whitelist',
    description: 'Administra invitaciones permitidas.',
    category: 'automod',
    userPermissions: [PermissionFlagsBits.ManageGuild],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const sub = interaction.options.getSubcommand();
      const guildId = interaction.guild!.id;

      if (sub === 'add') {
        const target = interaction.options.getString('codigo_o_id', true);
        await db.addInviteWhitelist(guildId, target);
        await interaction.reply({ content: `✅ Agregado a la lista blanca: \`${target}\`.` });
      } else if (sub === 'remove') {
        const target = interaction.options.getString('codigo_o_id', true);
        const removed = await db.removeInviteWhitelist(guildId, target);
        await interaction.reply({ content: removed ? `✅ Removido de la lista blanca: \`${target}\`.` : `❌ No estaba en la lista blanca.` });
      } else if (sub === 'list') {
        const list = await db.getInviteWhitelist(guildId);
        if (list.length === 0) {
          await interaction.reply({ content: 'ℹ️ No hay invitaciones ni servidores en la lista blanca.' });
          return;
        }
        await interaction.reply({ content: `📋 **Lista blanca de invitaciones:**\n${list.map(i => `• \`${i}\``).join('\n')}` });
      }
    },

    executePrefix: async (message: Message, args: string[]) => {
      const guildId = message.guild!.id;
      const sub = args[0]?.toLowerCase();

      if (sub === 'add' && args[1]) {
        await db.addInviteWhitelist(guildId, args[1]);
        await message.reply(`✅ Agregado a la lista blanca: \`${args[1]}\`.`);
      } else if (sub === 'remove' && args[1]) {
        const removed = await db.removeInviteWhitelist(guildId, args[1]);
        await message.reply(removed ? `✅ Removido de la lista blanca.` : `❌ No encontrado.`);
      } else if (sub === 'list') {
        const list = await db.getInviteWhitelist(guildId);
        await message.reply(list.length > 0 ? `📋 **Lista blanca:**\n${list.map(i => `• \`${i}\``).join('\n')}` : 'ℹ️ Lista blanca vacía.');
      } else {
        await message.reply('Uso: `>>whitelist <add|remove|list> <código_o_id>`');
      }
    }
  };
}
