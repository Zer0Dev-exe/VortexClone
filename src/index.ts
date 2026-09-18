import { SapphireClient, container } from '@sapphire/framework';
import { GatewayIntentBits, Partials, Message } from 'discord.js';
import { config } from './config.js';
import { Database } from './database/Database.js';
import { ModLogger } from './logging/ModLogger.js';
import { GuildLogger } from './logging/GuildLogger.js';
import { MessageCache } from './logging/MessageCache.js';
import { AutoMod } from './automod/AutoMod.js';
import { AntiRaid } from './automod/AntiRaid.js';
import { PunishmentScheduler } from './scheduler/PunishmentScheduler.js';
import { DashboardServer } from './dashboard/server.js';

async function main() {
  console.log('========================================================');
  console.log('🌀 Vortex Clone (Sapphire Framework & Discord.js v14)');
  console.log('   Inspirado en jagrosh/Vortex - Con MongoDB Atlas Cloud');
  console.log('========================================================\n');

  // 1. Initialize MongoDB Database
  const db = new Database();

  if (!config.mongoUri || config.mongoUri.includes('abcde.mongodb.net')) {
    console.warn('⚠️ [CONFIGURACIÓN REQUERIDA]: En .env se detecta el subdominio de plantilla "abcde.mongodb.net".');
    console.warn('   Debes sustituir "cluster0.abcde.mongodb.net" por la URL real de tu clúster de MongoDB Atlas.');
    console.warn('   (Obtén tu URL en cloud.mongodb.com -> Database -> Connect -> Drivers)');
    console.warn('   ℹ️ El bot funcionará en modo memoria (comandos como >>help y >>ping funcionarán sin crashear).\n');
  } else {
    try {
      console.log('🔄 Conectando a MongoDB Atlas...');
      await db.connect(config.mongoUri);
    } catch (err: any) {
      console.error('❌ Error conectando a MongoDB Atlas:', err.message);
      console.warn('   ℹ️ El bot continuará en modo degradado con valores por defecto en memoria.\n');
    }
  }

  // 2. Initialize Sapphire Client
  const client = new SapphireClient({
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
    ],
    defaultPrefix: config.defaultPrefix,
    loadMessageCommandListeners: true,
    fetchPrefix: async (message: Message) => {
      if (!message.guild) return config.defaultPrefix;
      try {
        const settings = await db.getGuildSettings(message.guild.id);
        return settings.prefix || config.defaultPrefix;
      } catch {
        return config.defaultPrefix;
      }
    }
  });

  // 3. Initialize Core Subsystems
  const messageCache = new MessageCache(5000);
  const modLogger = new ModLogger(client, db);
  const guildLogger = new GuildLogger(client, db);
  const autoMod = new AutoMod(client, db, modLogger);
  const antiRaid = new AntiRaid(db, modLogger);
  const scheduler = new PunishmentScheduler(client, db, modLogger, 15000);

  // 4. Inject into Sapphire container
  container.db = db;
  container.autoMod = autoMod;
  container.antiRaid = antiRaid;
  container.modLogger = modLogger;
  container.guildLogger = guildLogger;
  container.messageCache = messageCache;
  container.scheduler = scheduler;

  // 5. Start Temp Punishments Scheduler
  scheduler.start();

  // 6. Start Web Dashboard
  const dashboard = new DashboardServer(config.dashboardPort);
  await dashboard.start().catch((err) => {
    console.error('⚠️ [Dashboard] Error al inicializar servidor web:', err.message);
  });

  // 7. Graceful Shutdown
  const shutdown = async () => {
    console.log('\n🛑 Apagando Cosmic / Vortex Clone...');
    await dashboard.stop().catch(() => {});
    scheduler.stop();
    await db.disconnect().catch(() => {});
    client.destroy();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // 7. Connect to Discord Gateway
  if (!config.token || config.token === 'your_bot_token_here') {
    console.warn('\n⚠️ [AVISO]: No se ha configurado un DISCORD_TOKEN válido en el archivo .env.');
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
