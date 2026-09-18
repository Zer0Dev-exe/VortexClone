import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { Database } from './database/Database.js';
import { ModLogger } from './logging/ModLogger.js';
import { StrikeHandler } from './automod/StrikeHandler.js';
import { registerAllCommands } from './commands/CommandRegistry.js';
import { Client, GatewayIntentBits } from 'discord.js';

async function deploy() {
  if (!config.token || !config.clientId) {
    console.error('❌ DISCORD_TOKEN y CLIENT_ID son necesarios en el archivo .env para desplegar comandos.');
    process.exit(1);
  }

  const dummyClient = new Client({ intents: [GatewayIntentBits.Guilds] });
  const db = new Database();
  const modLogger = new ModLogger(dummyClient, db);
  const strikeHandler = new StrikeHandler(db, modLogger);

  const commandMap = registerAllCommands(dummyClient, db, modLogger, strikeHandler);
  const slashCommands = Array.from(commandMap.values())
    .filter(cmd => cmd.slashData)
    .map(cmd => cmd.slashData!.toJSON());

  const rest = new REST({ version: '10' }).setToken(config.token);

  console.log(`🚀 Desplegando ${slashCommands.length} comandos de barra diagonal (Slash Commands)...`);

  try {
    if (config.devGuildId) {
      console.log(`📡 Registrando comandos instantáneos en servidor de desarrollo: ${config.devGuildId}`);
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.devGuildId),
        { body: slashCommands }
      );
    } else {
      console.log('🌍 Registrando comandos globalmente (puede tardar hasta 1 hora en propagarse)...');
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: slashCommands }
      );
    }

    console.log('✅ Comandos registrados con éxito!');
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }
}

deploy();
