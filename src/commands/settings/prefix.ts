import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../types/index.js';
import { Database } from '../../database/Database.js';

export function createPrefixCommand(db: Database): Command {
  const slashData = new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Establece o consulta el prefijo de comandos de texto del servidor.')
    .addStringOption(opt => opt.setName('nuevo_prefijo').setDescription('El nuevo prefijo (ej. ! o >>)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  return {
    name: 'prefix',
    description: 'Establece o consulta el prefijo de texto.',
    category: 'settings',
    userPermissions: [PermissionFlagsBits.ManageGuild],
    slashData,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
      const newPrefix = interaction.options.getString('nuevo_prefijo');
      const guildId = interaction.guild!.id;

      if (!newPrefix) {
        const current = (await db.getGuildSettings(guildId)).prefix;
        await interaction.reply({ content: `ℹ️ El prefijo actual en este servidor es: \`${current}\`.` });
        return;
      }

      await db.updateGuildSettings(guildId, { prefix: newPrefix });
      await interaction.reply({ content: `✅ Prefijo actualizado correctamente a: \`${newPrefix}\`.` });
    },

    executePrefix: async (message: Message, args: string[]) => {
      const guildId = message.guild!.id;
      if (!args[0]) {
        const current = (await db.getGuildSettings(guildId)).prefix;
        await message.reply(`El prefijo actual es: \`${current}\`.`);
        return;
      }

      await db.updateGuildSettings(guildId, { prefix: args[0] });
      await message.reply(`✅ Prefijo actualizado a: \`${args[0]}\`.`);
    }
  };
}
