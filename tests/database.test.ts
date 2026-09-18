import { describe, it, expect } from 'vitest';
import { GuildConfigModel } from '../src/database/models/GuildConfig.js';
import { ModCaseModel } from '../src/database/models/ModCase.js';
import { StrikeModel } from '../src/database/models/Strike.js';
import { TempPunishmentModel } from '../src/database/models/TempPunishment.js';
import { CounterModel } from '../src/database/models/Counter.js';
import { Action } from '../src/types/index.js';

describe('MongoDB Atlas Mongoose Schemas', () => {
  it('instantiates GuildConfig schema with proper defaults', () => {
    const doc = new GuildConfigModel({ guildId: '123456789' });
    expect(doc.guildId).toBe('123456789');
    expect(doc.prefix).toBe('>>');
    expect(doc.raidMode).toBe(false);
    expect(doc.automod.antiInvite).toBe(1);
    expect(doc.automod.antiEveryone).toBe(1);
    expect(doc.automod.antiDuplicate).toBe(0);
    expect(doc.automod.dupeDeleteThresh).toBe(2);
    expect(doc.automod.dupeStrikeThresh).toBe(4);
    expect(doc.automod.autoRaidModeTime).toBe(10);
    expect(doc.punishments).toEqual([]);
    expect(doc.ignores).toEqual([]);
    expect(doc.inviteWhitelist).toEqual([]);
    expect(doc.filters).toEqual([]);
  });

  it('validates ModCase schema structure', () => {
    const modCase = new ModCaseModel({
      guildId: '123',
      caseNumber: 1,
      targetId: '456',
      targetTag: 'BadUser#0001',
      moderatorId: '789',
      moderatorTag: 'Admin#0001',
      action: Action.BAN,
      reason: 'Spam masivo',
      timestamp: Date.now()
    });

    expect(modCase.caseNumber).toBe(1);
    expect(modCase.action).toBe(Action.BAN);
    expect(modCase.reason).toBe('Spam masivo');
    expect(modCase.logMessageId).toBeNull();
  });

  it('validates Strike and TempPunishment schemas', () => {
    const strike = new StrikeModel({
      guildId: '123',
      userId: '456',
      strikes: 3
    });
    expect(strike.strikes).toBe(3);
    expect(strike.updatedAt).toBeDefined();

    const temp = new TempPunishmentModel({
      guildId: '123',
      userId: '456',
      action: Action.TEMPMUTE,
      expiresAt: Date.now() + 3600000
    });
    expect(temp.action).toBe(Action.TEMPMUTE);
    expect(temp.expiresAt).toBeGreaterThan(Date.now());
  });

  it('validates Counter schema', () => {
    const counter = new CounterModel({
      guildId: '123',
      field: 'caseNumber',
      seq: 5
    });
    expect(counter.guildId).toBe('123');
    expect(counter.field).toBe('caseNumber');
    expect(counter.seq).toBe(5);
  });
});
