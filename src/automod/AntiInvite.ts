import { Client, Message } from 'discord.js';
import { Database } from '../database/Database.js';

export class AntiInvite {
  // Matches discord.gg/xxx, discord.com/invite/xxx, discordapp.com/invite/xxx, and evasion tricks with dot/spaces
  private static readonly INVITE_REGEX =
    /(?:discord(?:\s*(?:\.|dot|\(\.\)|\(dot\))\s*gg|app\s*\.\s*com\s*\/\s*invite|\.com\s*\/\s*invite))\s*\/\s*([a-zA-Z0-9-]{2,32})/i;
  private static readonly DIRECT_INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]{2,32})/gi;

  public static hasInvite(content: string): boolean {
    return this.INVITE_REGEX.test(content) || this.DIRECT_INVITE_REGEX.test(content);
  }

  public static extractInviteCodes(content: string): string[] {
    const codes: Set<string> = new Set();

    let match: RegExpExecArray | null;
    const directRegex = new RegExp(this.DIRECT_INVITE_REGEX);
    while ((match = directRegex.exec(content)) !== null) {
      if (match[1]) codes.add(match[1]);
    }

    const obfuscatedMatch = this.INVITE_REGEX.exec(content);
    if (obfuscatedMatch && obfuscatedMatch[1]) {
      codes.add(obfuscatedMatch[1]);
    }

    return Array.from(codes);
  }

  public static async isForeignInvite(
    client: Client,
    db: Database,
    guildId: string,
    content: string
  ): Promise<boolean> {
    const codes = this.extractInviteCodes(content);
    if (codes.length === 0) return false;

    for (const code of codes) {
      // Check if code itself is whitelisted
      if (await db.isInviteWhitelisted(guildId, code)) {
        continue;
      }

      try {
        const invite = await client.fetchInvite(code);
        if (!invite.guild) continue;

        // If it's for the current guild, it's safe
        if (invite.guild.id === guildId) {
          continue;
        }

        // Check if target guild ID is whitelisted
        if (await db.isInviteWhitelisted(guildId, invite.guild.id)) {
          continue;
        }

        // Foreign unauthorized invite found!
        return true;
      } catch {
        // If invite is invalid or expired, we treat as invite link attempted
        return true;
      }
    }

    return false;
  }
}
