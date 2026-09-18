import { GuildMember, PermissionFlagsBits } from 'discord.js';

export class AutoDehoist {
  // Common hoist characters: ASCII chars before uppercase letters (33 to 64: ! " # $ % & ' ( ) * + , - . / 0-9 : ; < = > ? @)
  public static isHoisted(name: string, dehoistChar = '!'): boolean {
    if (!name || name.length === 0) return false;
    const firstChar = name.charAt(0);
    const maxCode = dehoistChar.charCodeAt(0);
    return firstChar.charCodeAt(0) <= maxCode || /^[\p{P}\p{S}]/u.test(firstChar);
  }

  public static dehoistedName(currentName: string): string {
    // Strip leading punctuation / symbols
    const cleaned = currentName.replace(/^[\s\p{P}\p{S}]+/gu, '').trim();
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 32);
    }
    return 'Dehoisted Member';
  }

  public static async checkAndDehoist(member: GuildMember, dehoistChar: string): Promise<boolean> {
    if (!dehoistChar) return false;
    if (!member.guild.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) return false;
    if (!member.manageable) return false;

    const name = member.displayName;
    if (this.isHoisted(name, dehoistChar)) {
      try {
        const newName = this.dehoistedName(name);
        await member.setNickname(newName, 'AutoMod: Dehoist');
        return true;
      } catch (err) {
        console.warn(`[AutoDehoist] Falló dehoist en ${member.user.tag}:`, err);
      }
    }

    return false;
  }
}
