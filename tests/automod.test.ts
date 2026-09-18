import { describe, it, expect } from 'vitest';
import { AntiInvite } from '../src/automod/AntiInvite.js';
import { AntiDuplicate } from '../src/automod/AntiDuplicate.js';
import { AntiCopypasta } from '../src/automod/AntiCopypasta.js';
import { AutoDehoist } from '../src/automod/AutoDehoist.js';
import { parseDurationToSeconds, formatSeconds } from '../src/utils/time.js';

describe('AntiInvite', () => {
  it('detects standard discord.gg and discord.com/invite links', () => {
    expect(AntiInvite.hasInvite('Join my server: https://discord.gg/minecraft')).toBe(true);
    expect(AntiInvite.hasInvite('Visit discord.com/invite/gaming now!')).toBe(true);
    expect(AntiInvite.hasInvite('Hello world, no links here')).toBe(false);
  });

  it('detects obfuscated evasion attempts', () => {
    expect(AntiInvite.hasInvite('discord(dot)gg/secret')).toBe(true);
    expect(AntiInvite.hasInvite('discord . gg / sneaky')).toBe(true);
  });

  it('extracts invite codes cleanly', () => {
    const codes = AntiInvite.extractInviteCodes('Check https://discord.gg/coolcode and discord.com/invite/othercode');
    expect(codes).toContain('coolcode');
    expect(codes).toContain('othercode');
  });
});

describe('AntiDuplicate', () => {
  it('condenses text by removing punctuation and spacing', () => {
    const raw = 'Hello,   World!??';
    expect(AntiDuplicate.condense(raw)).toBe('helloworld');
  });

  it('increments duplicate count for same content within window', () => {
    const dupe = new AntiDuplicate(10000);
    expect(dupe.check('guild1', 'user1', 'Buy cheap nitro here')).toBe(1);
    expect(dupe.check('guild1', 'user1', 'Buy cheap nitro here')).toBe(2);
    expect(dupe.check('guild1', 'user1', 'Buy   cheap nitro  here!!!')).toBe(3);
    // Different message resets count
    expect(dupe.check('guild1', 'user1', 'Something completely different')).toBe(1);
  });
});

describe('AntiCopypasta', () => {
  it('flags repetitive repeating text patterns', () => {
    const repetitiveText = 'This is a spam message that repeats constantly! '.repeat(5);
    expect(AntiCopypasta.isCopypasta(repetitiveText)).toBe(true);
  });

  it('allows normal conversation messages', () => {
    const normal = 'Hola a todos, bienvenidos al servidor de Discord. Espero que la pasen bien!';
    expect(AntiCopypasta.isCopypasta(normal)).toBe(false);
  });
});

describe('AutoDehoist', () => {
  it('detects hoisting characters at the start of names', () => {
    expect(AutoDehoist.isHoisted('! John', '!')).toBe(true);
    expect(AutoDehoist.isHoisted('* Alice', '!')).toBe(true);
    expect(AutoDehoist.isHoisted('Zack', '!')).toBe(false);
  });

  it('sanitizes hoisted names', () => {
    expect(AutoDehoist.dehoistedName('! John Doe')).toBe('John Doe');
    expect(AutoDehoist.dehoistedName('*** Super Mod')).toBe('Super Mod');
  });
});

describe('Time Utility', () => {
  it('parses duration strings accurately', () => {
    expect(parseDurationToSeconds('30s')).toBe(30);
    expect(parseDurationToSeconds('15m')).toBe(900);
    expect(parseDurationToSeconds('2h')).toBe(7200);
    expect(parseDurationToSeconds('1d')).toBe(86400);
    expect(parseDurationToSeconds('1w')).toBe(604800);
    expect(parseDurationToSeconds('invalid')).toBeNull();
  });

  it('formats seconds into readable strings', () => {
    expect(formatSeconds(45)).toBe('45s');
    expect(formatSeconds(120)).toBe('2m');
    expect(formatSeconds(3600)).toBe('1h');
    expect(formatSeconds(86400)).toBe('1d');
  });
});
