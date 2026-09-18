import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { container } from '@sapphire/framework';
import { config } from '../../config.js';
import { UserSession } from './auth.js';
import { Action } from '../../types/index.js';

export const apiRouter: Router = Router();

// Helper to normalize Express 5 string | string[] params to string
function param(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : (val || '');
}

// Extend Express Request to hold user session
declare global {
  namespace Express {
    interface Request {
      userSession?: UserSession;
    }
  }
}

// Authentication Middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.cosmic_session;
  if (!token) {
    return res.status(401).json({ error: 'No autorizado. Por favor inicia sesión.' });
  }

  try {
    const decoded = jwt.verify(token, config.sessionSecret) as UserSession;
    req.userSession = decoded;
    next();
  } catch {
    res.clearCookie('cosmic_session');
    return res.status(401).json({ error: 'Sesión expirada o inválida.' });
  }
}

// Guild Admin Permission Middleware
export async function requireGuildAdmin(req: Request, res: Response, next: NextFunction) {
  const guildId = param(req.params.guildId);
  const user = req.userSession;

  if (!user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const client = container.client;
  const guild = client.guilds.cache.get(guildId);

  // If guild is cached, check if user is the guild owner or has Administrator / ManageGuild permission
  if (guild) {
    if (guild.ownerId === user.id) {
      return next();
    }

    try {
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (member && (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild))) {
        return next();
      }
    } catch {
      // Continue to check via OAuth2 guilds
    }
  }

  // Fallback: If user has accessToken, check their Discord guilds
  if (user.accessToken) {
    try {
      const userGuildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      if (userGuildsRes.ok) {
        const userGuilds = await userGuildsRes.json() as Array<{ id: string; permissions: string }>;
        const target = userGuilds.find(g => g.id === guildId);
        if (target) {
          const permBigInt = BigInt(target.permissions);
          const isAdmin = (permBigInt & 0x8n) === 0x8n;
          const isManager = (permBigInt & 0x20n) === 0x20n;
          if (isAdmin || isManager) {
            return next();
          }
        }
      }
    } catch (err) {
      console.error('[Dashboard API] Error checking user guilds permission:', err);
    }
  }

  return res.status(403).json({ error: 'No tienes permisos de Administrador o Gestionar Servidor en este servidor.' });
}

// GET /api/stats - Global bot statistics
apiRouter.get('/stats', (_req: Request, res: Response) => {
  const client = container.client;
  const db = container.db;

  const totalGuilds = client?.guilds?.cache?.size || 0;
  let totalUsers = 0;
  if (client?.guilds?.cache) {
    for (const g of client.guilds.cache.values()) {
      totalUsers += g.memberCount || 0;
    }
  }

  res.json({
    botName: client?.user?.username || 'Cosmic',
    botTag: client?.user?.tag || 'Cosmic#3912',
    avatar: client?.user?.displayAvatarURL({ size: 128 }) || null,
    guildsCount: totalGuilds,
    usersCount: totalUsers,
    ping: client?.ws?.ping ?? 0,
    dbConnected: db.isConnected(),
    uptime: process.uptime()
  });
});

// GET /api/guilds - List user guilds with management permissions
apiRouter.get('/guilds', requireAuth, async (req: Request, res: Response) => {
  const user = req.userSession!;
  const client = container.client;

  if (!user.accessToken) {
    return res.json({ guilds: [] });
  }


  try {
    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${user.accessToken}` }
    });

    if (!response.ok) {
      console.warn('[Dashboard API] Failed to fetch user guilds, falling back to cached guilds.');
      const fallbackList = Array.from(client.guilds.cache.values()).map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL({ size: 128 }),
        memberCount: g.memberCount,
        botInGuild: true,
        hasAdmin: true
      }));
      return res.json({ guilds: fallbackList });
    }

    const discordGuilds = await response.json() as Array<{
      id: string;
      name: string;
      icon: string | null;
      permissions: string;
      owner: boolean;
    }>;

    // Filter guilds where user has Administrator (0x8) or Manage Guild (0x20)
    const manageable = discordGuilds.filter(g => {
      if (g.owner) return true;
      const perm = BigInt(g.permissions);
      return (perm & 0x8n) === 0x8n || (perm & 0x20n) === 0x20n;
    });

    const result = manageable.map(g => {
      const botInGuild = client.guilds.cache.has(g.id);
      const iconUrl = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null;
      return {
        id: g.id,
        name: g.name,
        icon: iconUrl,
        botInGuild,
        hasAdmin: true
      };
    });

    return res.json({ guilds: result });
  } catch (err: any) {
    console.error('[Dashboard API] Error fetching user guilds:', err);
    return res.status(500).json({ error: 'Error al obtener servidores de Discord' });
  }
});

// GET /api/guilds/:guildId - Server details, channels, roles, and settings
apiRouter.get('/guilds/:guildId', requireAuth, requireGuildAdmin, async (req: Request, res: Response) => {
  const guildId = param(req.params.guildId);
  const client = container.client;
  const db = container.db;

  const guild = client.guilds.cache.get(guildId);
  const botInGuild = Boolean(guild);

  // Channels and Roles
  let textChannels: Array<{ id: string; name: string }> = [];
  let voiceChannels: Array<{ id: string; name: string }> = [];
  let roles: Array<{ id: string; name: string; color: string; position: number }> = [];
  let guildName = guild?.name || `Servidor ${guildId}`;
  let guildIcon = guild?.iconURL({ size: 128 }) || null;
  let memberCount = guild?.memberCount || 0;

  if (guild) {
    // Extract text/announcement channels
    textChannels = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
      .map(c => ({ id: c.id, name: `#${c.name}` }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Extract voice channels
    voiceChannels = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice)
      .map(c => ({ id: c.id, name: `[Voz] ${c.name}` }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Extract roles (excluding @everyone)
    roles = guild.roles.cache
      .filter(r => r.id !== guild.id)
      .map(r => ({
        id: r.id,
        name: r.name,
        color: r.hexColor !== '#000000' ? r.hexColor : '#99AAB5',
        position: r.position
      }))
      .sort((a, b) => b.position - a.position);
  }

  const [settings, automod, punishments, whitelist, filters, stats] = await Promise.all([
    db.getGuildSettings(guildId),
    db.getAutomodSettings(guildId),
    db.getPunishments(guildId),
    db.getInviteWhitelist(guildId),
    db.getFilters(guildId),
    db.getGuildStats(guildId)
  ]);

  return res.json({
    guild: {
      id: guildId,
      name: guildName,
      icon: guildIcon,
      memberCount,
      botInGuild
    },
    channels: {
      text: textChannels,
      voice: voiceChannels
    },
    roles,
    settings,
    automod,
    punishments,
    whitelist,
    filters,
    stats
  });
});

// PATCH /api/guilds/:guildId/settings - Update general settings
apiRouter.patch('/guilds/:guildId/settings', requireAuth, requireGuildAdmin, async (req: Request, res: Response) => {
  const guildId = param(req.params.guildId);
  const db = container.db;

  try {
    const {
      prefix,
      timezone,
      modlog_channel_id,
      messagelog_channel_id,
      serverlog_channel_id,
      voicelog_channel_id,
      mod_role_id,
      mute_role_id,
      raid_mode
    } = req.body;

    await db.updateGuildSettings(guildId, {
      prefix: prefix ? prefix.trim() : undefined,
      timezone,
      modlog_channel_id,
      messagelog_channel_id,
      serverlog_channel_id,
      voicelog_channel_id,
      mod_role_id,
      mute_role_id,
      raid_mode: raid_mode !== undefined ? Number(raid_mode) : undefined
    });

    const updated = await db.getGuildSettings(guildId);
    return res.json({ success: true, settings: updated });
  } catch (err: any) {
    console.error('[Dashboard API] Error updating settings:', err);
    return res.status(500).json({ error: 'Error actualizando configuración del servidor' });
  }
});

// PATCH /api/guilds/:guildId/automod - Update automod settings
apiRouter.patch('/guilds/:guildId/automod', requireAuth, requireGuildAdmin, async (req: Request, res: Response) => {
  const guildId = param(req.params.guildId);
  const db = container.db;

  try {
    const {
      anti_invite,
      anti_copypasta,
      anti_everyone,
      anti_referral,
      anti_duplicate,
      dupe_delete_thresh,
      dupe_strike_thresh,
      max_lines,
      max_mentions,
      auto_dehoist,
      auto_raid_mode_number,
      auto_raid_mode_time
    } = req.body;

    await db.updateAutomodSettings(guildId, {
      anti_invite: anti_invite !== undefined ? Number(anti_invite) : undefined,
      anti_copypasta: anti_copypasta !== undefined ? Number(anti_copypasta) : undefined,
      anti_everyone: anti_everyone !== undefined ? Number(anti_everyone) : undefined,
      anti_referral: anti_referral !== undefined ? Number(anti_referral) : undefined,
      anti_duplicate: anti_duplicate !== undefined ? Number(anti_duplicate) : undefined,
      dupe_delete_thresh: dupe_delete_thresh !== undefined ? Number(dupe_delete_thresh) : undefined,
      dupe_strike_thresh: dupe_strike_thresh !== undefined ? Number(dupe_strike_thresh) : undefined,
      max_lines: max_lines !== undefined ? Number(max_lines) : undefined,
      max_mentions: max_mentions !== undefined ? Number(max_mentions) : undefined,
      auto_dehoist: auto_dehoist !== undefined ? String(auto_dehoist) : undefined,
      auto_raid_mode_number: auto_raid_mode_number !== undefined ? Number(auto_raid_mode_number) : undefined,
      auto_raid_mode_time: auto_raid_mode_time !== undefined ? Number(auto_raid_mode_time) : undefined
    });

    const updated = await db.getAutomodSettings(guildId);
    return res.json({ success: true, automod: updated });
  } catch (err: any) {
    console.error('[Dashboard API] Error updating automod:', err);
    return res.status(500).json({ error: 'Error actualizando reglas de AutoMod' });
  }
});

// Whitelist Endpoints
apiRouter.post('/guilds/:guildId/whitelist', requireAuth, requireGuildAdmin, async (req: Request, res: Response) => {
  const guildId = param(req.params.guildId);
  const { target } = req.body;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'target es requerido' });
  }
  await container.db.addInviteWhitelist(guildId, target.trim());
  const list = await container.db.getInviteWhitelist(guildId);
  res.json({ success: true, whitelist: list });
});

apiRouter.delete('/guilds/:guildId/whitelist/:target', requireAuth, requireGuildAdmin, async (req: Request, res: Response) => {
  const guildId = param(req.params.guildId);
  const target = param(req.params.target);
  await container.db.removeInviteWhitelist(guildId, target);
  const list = await container.db.getInviteWhitelist(guildId);
  res.json({ success: true, whitelist: list });
});

// Filters Endpoints
apiRouter.post('/guilds/:guildId/filters', requireAuth, requireGuildAdmin, async (req: Request, res: Response) => {
  const guildId = param(req.params.guildId);
  const { pattern, isRegex, strikes } = req.body;
  if (!pattern || typeof pattern !== 'string') {
    return res.status(400).json({ error: 'pattern es requerido' });
  }
  await container.db.addFilter(guildId, pattern.trim(), Boolean(isRegex), strikes ? Number(strikes) : 1);
  const filters = await container.db.getFilters(guildId);
  res.json({ success: true, filters });
});

apiRouter.delete('/guilds/:guildId/filters/:id', requireAuth, requireGuildAdmin, async (req: Request, res: Response) => {
  const guildId = param(req.params.guildId);
  const id = param(req.params.id);
  await container.db.removeFilter(guildId, id);
  const filters = await container.db.getFilters(guildId);
  res.json({ success: true, filters });
});

// Punishments Endpoints
apiRouter.post('/guilds/:guildId/punishments', requireAuth, requireGuildAdmin, async (req: Request, res: Response) => {
  const guildId = param(req.params.guildId);
  const { strikeCount, action, durationSeconds } = req.body;

  if (!strikeCount || !action) {
    return res.status(400).json({ error: 'strikeCount y action son requeridos' });
  }

  await container.db.setPunishment(
    guildId,
    Number(strikeCount),
    action as Action,
    durationSeconds ? Number(durationSeconds) : 0
  );

  const punishments = await container.db.getPunishments(guildId);
  res.json({ success: true, punishments });
});

apiRouter.delete('/guilds/:guildId/punishments/:strikeCount', requireAuth, requireGuildAdmin, async (req: Request, res: Response) => {
  const guildId = param(req.params.guildId);
  const strikeCount = param(req.params.strikeCount);
  await container.db.removePunishment(guildId, Number(strikeCount));
  const punishments = await container.db.getPunishments(guildId);
  res.json({ success: true, punishments });
});

// Cases Endpoints
apiRouter.get('/guilds/:guildId/cases', requireAuth, requireGuildAdmin, async (req: Request, res: Response) => {
  const guildId = param(req.params.guildId);
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 25;
  const action = req.query.action as string | undefined;
  const search = req.query.search as string | undefined;

  const result = await container.db.getGuildCases(guildId, limit, page, action, search);
  res.json(result);
});

apiRouter.patch('/guilds/:guildId/cases/:caseNumber/reason', requireAuth, requireGuildAdmin, async (req: Request, res: Response) => {
  const guildId = param(req.params.guildId);
  const caseNumber = param(req.params.caseNumber);
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string') {
    return res.status(400).json({ error: 'reason es requerido' });
  }

  const success = await container.db.updateCaseReason(guildId, Number(caseNumber), reason.trim());
  if (!success) {
    return res.status(404).json({ error: 'Caso no encontrado' });
  }

  const updatedCase = await container.db.getCase(guildId, Number(caseNumber));
  res.json({ success: true, modCase: updatedCase });
});

// Strikes Endpoints
apiRouter.get('/guilds/:guildId/strikes', requireAuth, requireGuildAdmin, async (req: Request, res: Response) => {
  const guildId = param(req.params.guildId);
  const strikes = await container.db.getGuildStrikes(guildId);
  res.json({ strikes });
});

apiRouter.post('/guilds/:guildId/strikes', requireAuth, requireGuildAdmin, async (req: Request, res: Response) => {
  const guildId = param(req.params.guildId);
  const { userId, count } = req.body;

  if (!userId || count === undefined) {
    return res.status(400).json({ error: 'userId y count son requeridos' });
  }

  const updated = await container.db.addStrikes(guildId, userId, Number(count));
  res.json({ success: true, userId, strikes: updated });
});
