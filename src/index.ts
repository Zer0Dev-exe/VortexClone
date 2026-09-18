import {
  Client,
  GatewayIntentBits,
  Partials
} from 'discord.js';
import { config } from './config.js';
import { Database } from './database/Database.js';
import { ModLogger } from './logging/ModLogger.js';
import { GuildLogger } from './logging/GuildLogger.js';
import { MessageCache } from './logging/MessageCache.js';
import { AutoMod } from './automod/AutoMod.js';
import { AntiRaid } from './automod/AntiRaid.js';
import { PunishmentScheduler } from './scheduler/PunishmentScheduler.js';
import { registerAllCommands } from './commands/CommandRegistry.js';
import { setupEventListeners } from './events/index.js';

async function main() {
  console.log('========================================================');
  console.log('🌀 Vortex Clone (TypeScript & Discord.js v14)');
  console.log('   Inspirado en jagrosh/Vortex - Con MongoDB Atlas Cloud');
  console.log('========================================================\n');

  // 1. Initialize MongoDB Database
  const db = new Database();

  if (!config.mongoUri || config.mongoUri.includes('abcde.mongodb.net')) {
    console.warn('⚠️ [AVISO]: MONGODB_URI no configurado o es una plantilla.');
    console.warn('   Configura la URL de tu cluster en el archivo .env (ej. mongodb+srv://...)');
  } else {
    try {
      console.log('🔄 Conectando a MongoDB Atlas...');
      await db.connect(config.mongoUri);
    } catch (err: any) {
      console.error('❌ Error conectando a MongoDB Atlas:', err.message);
    }
  }

  // 2. Initialize Discord Client with required Intents and Partials
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
      Partials.Message,
      Partials.Channel,
      Partials.GuildMember,
      Partials.User
    ]
  });

  // 3. Initialize Core Subsystems
  const messageCache = new MessageCache(5000);
  const modLogger = new ModLogger(client, db);
  const guildLogger = new GuildLogger(client, db);
  const autoMod = new AutoMod(client, db, modLogger);
  const antiRaid = new AntiRaid(db, modLogger);

  // 4. Register Commands
  const commands = registerAllCommands(client, db, modLogger, autoMod.getStrikeHandler());
  console.log(`📋 ${commands.size} comandos cargados (Moderación, AutoMod, Configuración, General).`);

  // 5. Setup Gateway Event Listeners
  setupEventListeners(
    client,
    db,
    commands,
    autoMod,
    antiRaid,
    modLogger,
    guildLogger,
    messageCache
  );

  // 6. Start Temp Punishments Scheduler
  const scheduler = new PunishmentScheduler(client, db, modLogger, 15000);
  scheduler.start();

  // 7. Graceful Shutdown
  const shutdown = async () => {
    console.log('\n🛑 Apagando Vortex Clone...');
    scheduler.stop();
    await db.disconnect().catch(() => {});
    client.destroy();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // 8. Connect to Discord Gateway
  if (!config.token || config.token === 'your_bot_token_here') {
    console.warn('\n⚠️ [AVISO]: No se ha configurado un DISCORD_TOKEN válido en el archivo .env.');
    console.warn('   Crea tu archivo .env basándote en .env.example y añade el Token de tu bot.');
    console.warn('   La arquitectura, esquemas de MongoDB Atlas y suite de comandos están listos.\n');
    return;
  }

  try {
    console.log('🔄 Iniciando sesión en Discord Gateway...');
    await client.login(config.token);
  } catch (err: any) {
    console.error('❌ Error al iniciar sesión en Discord:', err.message);
  }
}

main().catch(err => {
  console.error('❌ Error fatal al inicializar Vortex Clone:', err);
});
