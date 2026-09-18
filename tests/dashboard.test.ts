import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { getDiscordAuthUrl } from '../src/dashboard/routes/auth.js';
import { config } from '../src/config.js';

describe('Cosmic Dashboard Backend', () => {
  it('generates valid Discord OAuth2 authorization URL', () => {
    const url = getDiscordAuthUrl();
    expect(url).toContain('https://discord.com/api/oauth2/authorize');
    expect(url).toContain('client_id=');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=identify%20guilds');
    expect(url).toContain(encodeURIComponent(`${config.dashboardUrl}/auth/callback`));
  });

  it('signs and verifies user session JWT tokens securely', () => {
    const mockUser = {
      id: '999888777666',
      username: 'TestAdmin',
      globalName: 'Test Administrator',
      avatar: 'abc123avatarhash'
    };

    const token = jwt.sign(mockUser, config.sessionSecret, { expiresIn: '1h' });
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, config.sessionSecret) as typeof mockUser;
    expect(decoded.id).toBe(mockUser.id);
    expect(decoded.username).toBe(mockUser.username);
    expect(decoded.globalName).toBe(mockUser.globalName);
    expect(decoded.avatar).toBe(mockUser.avatar);
  });

});
