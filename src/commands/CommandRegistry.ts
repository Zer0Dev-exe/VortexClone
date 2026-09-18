import { Client } from 'discord.js';
import { Command } from '../types/index.js';
import { Database } from '../database/Database.js';
import { ModLogger } from '../logging/ModLogger.js';
import { StrikeHandler } from '../automod/StrikeHandler.js';

// Moderation
import { createBanCommand } from './moderation/ban.js';
import { createUnbanCommand } from './moderation/unban.js';
import { createSoftbanCommand } from './moderation/softban.js';
import { createKickCommand } from './moderation/kick.js';
import { createMuteCommand } from './moderation/mute.js';
import { createUnmuteCommand } from './moderation/unmute.js';
import { createStrikeCommand } from './moderation/strike.js';
import { createPardonCommand } from './moderation/pardon.js';
import { createCleanCommand } from './moderation/clean.js';
import { createCheckCommand } from './moderation/check.js';
import { createReasonCommand } from './moderation/reason.js';
import { createSlowmodeCommand } from './moderation/slowmode.js';
import { createRaidCommand } from './moderation/raid.js';

// Automod
import { createAntiinviteCommand } from './automod/antiinvite.js';
import { createMaxmentionsCommand } from './automod/maxmentions.js';
import { createMaxlinesCommand } from './automod/maxlines.js';
import { createAutodehoistCommand } from './automod/autodehoist.js';
import { createAutoraidmodeCommand } from './automod/autoraidmode.js';
import { createFilterCommand } from './automod/filter.js';
import { createWhitelistCommand } from './automod/whitelist.js';

// Settings
import { createSetupCommand } from './settings/setup.js';
import { createSettingsCommand } from './settings/settings.js';
import { createPunishmentCommand } from './settings/punishment.js';
import { createPrefixCommand } from './settings/prefix.js';

// General
import { createPingCommand } from './general/ping.js';
import { createAboutCommand } from './general/about.js';
import { createHelpCommand } from './general/help.js';

export function registerAllCommands(
  client: Client,
  db: Database,
  modLogger: ModLogger,
  strikeHandler: StrikeHandler
): Map<string, Command> {
  const commands = new Map<string, Command>();

  const list: Command[] = [
    // Moderation
    createBanCommand(db, modLogger),
    createUnbanCommand(db, modLogger),
    createSoftbanCommand(db, modLogger),
    createKickCommand(db, modLogger),
    createMuteCommand(db, modLogger),
    createUnmuteCommand(db, modLogger),
    createStrikeCommand(db, strikeHandler),
    createPardonCommand(db, modLogger),
    createCleanCommand(modLogger),
    createCheckCommand(db),
    createReasonCommand(modLogger),
    createSlowmodeCommand(),
    createRaidCommand(db, modLogger),

    // Automod
    createAntiinviteCommand(db),
    createMaxmentionsCommand(db),
    createMaxlinesCommand(db),
    createAutodehoistCommand(db),
    createAutoraidmodeCommand(db),
    createFilterCommand(db),
    createWhitelistCommand(db),

    // Settings
    createSetupCommand(db),
    createSettingsCommand(db),
    createPunishmentCommand(db),
    createPrefixCommand(db),

    // General
    createPingCommand(),
    createAboutCommand()
  ];

  for (const cmd of list) {
    commands.set(cmd.name, cmd);
  }

  // Help command needs reference to all commands
  const helpCmd = createHelpCommand(commands);
  commands.set(helpCmd.name, helpCmd);

  return commands;
}
