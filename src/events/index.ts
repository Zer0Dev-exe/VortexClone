import {
  Client,
  Events,
  GuildMember,
  Interaction,
  Message,
  VoiceState
} from 'discord.js';
import { Database } from '../database/Database.js';
import { AutoMod } from '../automod/AutoMod.js';
import { AntiRaid } from '../automod/AntiRaid.js';
import { AutoDehoist } from '../automod/AutoDehoist.js';
import { ModLogger } from '../logging/ModLogger.js';
import { GuildLogger } from '../logging/GuildLogger.js';
import { MessageCache } from '../logging/MessageCache.js';
import { Command } from '../types/index.js';

export function setupEventListeners(
  client: Client,
  db: Database,
  commands: Map<string, Command>,
  autoMod: AutoMod,
  antiRaid: AntiRaid,
  modLogger: ModLogger,
  guildLogger: GuildLogger,
  msgCache: MessageCache
): void {
  // --- Client Error Handling ---
  client.on('error', error => {
    console.error('[DiscordClient] Error no capturado en el cliente:', error);
  });

  // --- Client Ready ---
  client.once(Events.ClientReady, c => {
    console.log(`✅ [Vortex] Conectado como ${c.user.tag}!`);
    c.user.setActivity('la seguridad del servidor | /help', { type: 3 }); // 3 = WATCHING
  });

  // --- Interaction Create (Slash Commands) ---
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command || !command.executeSlash) {
      await interaction.reply({ content: '❌ Comando no encontrado o sin implementar.', ephemeral: true });
      return;
    }

    // Permission check
    if (command.userPermissions && interaction.memberPermissions) {
      for (const perm of command.userPermissions) {
        if (!interaction.memberPermissions.has(perm)) {
          await interaction.reply({ content: '❌ No tienes permisos suficientes para ejecutar este comando.', ephemeral: true });
          return;
        }
      }
    }

    try {
      await command.executeSlash(interaction);
    } catch (err: any) {
      console.error(`[InteractionError] Error ejecutando /${interaction.commandName}:`, err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `❌ Error interno: ${err.message}`, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: `❌ Error interno: ${err.message}`, ephemeral: true }).catch(() => {});
      }
    }
  });

  // --- Message Create ---
  client.on(Events.MessageCreate, async (message: Message) => {
    try {
      if (!message.guild || message.author.bot) return;

      // Cache message for audit logs
      msgCache.put(message);

      // 1. AutoMod inspection
      const automodTriggered = await autoMod.performAutomod(message);
      if (automodTriggered) return; // Stop if message was filtered or punished

      // 2. Prefix Command processing
      const guildSettings = await db.getGuildSettings(message.guild.id);
      const prefix = guildSettings.prefix || '>>';

      if (!message.content.startsWith(prefix)) return;

      const args = message.content.slice(prefix.length).trim().split(/\s+/);
      const commandName = args.shift()?.toLowerCase();
      if (!commandName) return;

      const command = commands.get(commandName);
      if (!command || !command.executePrefix) return;

      // Permission check
      if (command.userPermissions && message.member) {
        for (const perm of command.userPermissions) {
          if (!message.member.permissions.has(perm)) {
            await message.reply('❌ No tienes los permisos requeridos para usar este comando.');
            return;
          }
        }
      }

      await command.executePrefix(message, args);
    } catch (err: any) {
      console.error(`[MessageCreate Error]:`, err);
      try {
        await message.reply(`❌ Ocurrió un error al procesar el mensaje o comando: ${err.message}`);
      } catch {
        // Ignore reply failure if bot cannot send messages
      }
    }
  });

  // --- Message Update (Edit audit and automod) ---
  client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
    try {
      if (!newMsg.guild) return;

      const fullNewMsg = newMsg.partial ? await newMsg.fetch().catch(() => null) : newMsg;
      if (!fullNewMsg || fullNewMsg.author?.bot) return;

      const cached = msgCache.get(fullNewMsg.id);
      if (cached) {
        await guildLogger.logMessageEdit(cached, fullNewMsg);
      }

      // Run automod on edited content
      await autoMod.performAutomod(fullNewMsg);

      // Update cache with edited message
      msgCache.put(fullNewMsg);
    } catch (err) {
      console.error('[MessageUpdate Error]:', err);
    }
  });

  // --- Message Delete (Delete audit) ---
  client.on(Events.MessageDelete, async message => {
    try {
      if (!message.guild) return;

      const cached = msgCache.delete(message.id);
      if (cached) {
        const channelName = 'name' in message.channel ? (message.channel as any).name : 'desconocido';
        await guildLogger.logMessageDelete(cached, channelName);
      }
    } catch (err) {
      console.error('[MessageDelete Error]:', err);
    }
  });

  // --- Member Join ---
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    try {
      // 1. Anti-Raid check
      const kickedByRaid = await antiRaid.onMemberJoin(member);
      if (kickedByRaid) return;

      // 2. Auto-Dehoist check
      const am = await db.getAutomodSettings(member.guild.id);
      if (am.auto_dehoist) {
        await AutoDehoist.checkAndDehoist(member, am.auto_dehoist);
      }

      // 3. Server log
      await guildLogger.logMemberJoin(member);
    } catch (err) {
      console.error('[GuildMemberAdd Error]:', err);
    }
  });

  // --- Member Leave ---
  client.on(Events.GuildMemberRemove, async member => {
    try {
      await guildLogger.logMemberLeave(member);
    } catch (err) {
      console.error('[GuildMemberRemove Error]:', err);
    }
  });

  // --- Member Update (Dehoist on nick changes) ---
  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    try {
      if (oldMember.displayName !== newMember.displayName) {
        const am = await db.getAutomodSettings(newMember.guild.id);
        if (am.auto_dehoist) {
          await AutoDehoist.checkAndDehoist(newMember, am.auto_dehoist);
        }
      }
    } catch (err) {
      console.error('[GuildMemberUpdate Error]:', err);
    }
  });

  // --- Voice State Update ---
  client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
    try {
      await guildLogger.logVoiceStateUpdate(oldState, newState);
    } catch (err) {
      console.error('[VoiceStateUpdate Error]:', err);
    }
  });
}
