import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { config } from './config.js';

async function deploy() {
  if (!config.token || !config.clientId) {
    console.error('❌ DISCORD_TOKEN y CLIENT_ID son requeridos en .env para desplegar comandos.');
    process.exit(1);
  }

  console.log('🚀 Sincronizando comandos con Discord a través de Sapphire Framework...');
  const client = new SapphireClient({
    intents: [GatewayIntentBits.Guilds]
  });

  await client.login(config.token);
  console.log('✅ Sapphire Framework ha sincronizado los comandos de aplicación correctamente.');
  setTimeout(() => {
    client.destroy();
    process.exit(0);
  }, 3000);
}

deploy().catch(err => {
  console.error('❌ Error sincronizando comandos:', err);
  process.exit(1);
});
