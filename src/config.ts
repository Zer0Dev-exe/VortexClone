import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN es obligatorio'),
  CLIENT_ID: z.string().optional().default(''),
  CLIENT_SECRET: z.string().optional().default(''),
  DEFAULT_PREFIX: z.string().default('>>'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI es obligatorio para conectar con MongoDB Atlas'),
  DEV_GUILD_ID: z.string().optional().default(''),
  DASHBOARD_PORT: z.coerce.number().default(3000),
  DASHBOARD_URL: z.string().default('http://localhost:3000'),
  SESSION_SECRET: z.string().default('cosmic-vortex-super-secret-session-key-2026')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('⚠️ Configuración incompleta o advertencias en variables de entorno:');
  parsed.error.issues.forEach((err: any) => console.warn(` - ${err.path.join('.')}: ${err.message}`));
}

export const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  clientSecret: process.env.CLIENT_SECRET || '',
  defaultPrefix: process.env.DEFAULT_PREFIX || '>>',
  mongoUri: process.env.MONGODB_URI || '',
  devGuildId: process.env.DEV_GUILD_ID || '',
  dashboardPort: process.env.DASHBOARD_PORT ? Number(process.env.DASHBOARD_PORT) : 3000,
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000',
  sessionSecret: process.env.SESSION_SECRET || 'cosmic-vortex-super-secret-session-key-2026'
};

