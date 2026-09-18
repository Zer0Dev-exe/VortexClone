import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN es obligatorio'),
  CLIENT_ID: z.string().optional().default(''),
  DEFAULT_PREFIX: z.string().default('>>'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI es obligatorio para conectar con MongoDB Atlas'),
  DEV_GUILD_ID: z.string().optional().default('')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('⚠️ Configuración incompleta o advertencias en variables de entorno:');
  parsed.error.issues.forEach((err: any) => console.warn(` - ${err.path.join('.')}: ${err.message}`));
}

export const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  defaultPrefix: process.env.DEFAULT_PREFIX || '>>',
  mongoUri: process.env.MONGODB_URI || '',
  devGuildId: process.env.DEV_GUILD_ID || ''
};
