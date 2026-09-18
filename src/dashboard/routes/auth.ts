import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';

export const authRouter: Router = Router();

const DISCORD_API = 'https://discord.com/api/v10';

export interface UserSession {
  id: string;
  username: string;
  globalName?: string;
  avatar: string | null;
  accessToken: string;
}

// Helper to construct Discord OAuth2 authorization URL
export function getDiscordAuthUrl(): string {
  const redirectUri = encodeURIComponent(`${config.dashboardUrl}/auth/callback`);
  const scope = encodeURIComponent('identify guilds');
  return `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
}

// GET /auth/login - Redirect directly to Discord OAuth2
authRouter.get('/login', (_req: Request, res: Response) => {
  return res.redirect(getDiscordAuthUrl());
});


// GET /auth/callback - Exchange authorization code for token
authRouter.get('/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.redirect('/?error=missing_code');
  }

  try {
    const redirectUri = `${config.dashboardUrl}/auth/callback`;

    // 1. Exchange code for access token
    const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('[Dashboard OAuth2] Error exchanging code:', errBody);
      return res.redirect(`/?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json() as { access_token: string; token_type: string; expires_in: number };

    // 2. Fetch user profile
    const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
      headers: {
        Authorization: `${tokenData.token_type} ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      return res.redirect('/?error=user_fetch_failed');
    }

    const userData = await userResponse.json() as {
      id: string;
      username: string;
      global_name?: string;
      avatar: string | null;
    };

    const sessionPayload: UserSession = {
      id: userData.id,
      username: userData.username,
      globalName: userData.global_name,
      avatar: userData.avatar,
      accessToken: tokenData.access_token
    };

    // 3. Issue signed JWT session cookie
    const sessionToken = jwt.sign(sessionPayload, config.sessionSecret, { expiresIn: '7d' });

    res.cookie('cosmic_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    return res.redirect('/dashboard');
  } catch (err: any) {
    console.error('[Dashboard OAuth2] Callback exception:', err);
    return res.redirect('/?error=oauth_exception');
  }
});

// GET /auth/logout - Clear session
authRouter.get('/logout', (_req: Request, res: Response) => {
  res.clearCookie('cosmic_session');
  res.redirect('/');
});

// GET /api/auth/me - Return current logged in user
authRouter.get('/me', (req: Request, res: Response) => {
  const token = req.cookies?.cosmic_session;
  if (!token) {
    return res.json({
      isAuthenticated: false,
      user: null,
      clientId: config.clientId,
      hasSecret: Boolean(config.clientSecret && config.clientSecret !== 'your_client_secret_here')
    });
  }

  try {
    const decoded = jwt.verify(token, config.sessionSecret) as UserSession;
    return res.json({
      isAuthenticated: true,
      user: decoded,
      clientId: config.clientId,
      hasSecret: Boolean(config.clientSecret && config.clientSecret !== 'your_client_secret_here')
    });
  } catch {
    res.clearCookie('cosmic_session');
    return res.json({
      isAuthenticated: false,
      user: null,
      clientId: config.clientId,
      hasSecret: Boolean(config.clientSecret && config.clientSecret !== 'your_client_secret_here')
    });
  }
});
