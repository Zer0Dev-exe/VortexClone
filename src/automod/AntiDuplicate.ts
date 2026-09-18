export interface DupeRecord {
  lastContent: string;
  lastTimestamp: number;
  count: number;
}

export class AntiDuplicate {
  // Key: guildId:userId -> DupeRecord
  private records: Map<string, DupeRecord> = new Map();
  private maxWindowMs: number;

  constructor(maxWindowMs = 15000) {
    this.maxWindowMs = maxWindowMs;
  }

  // Removes whitespace, punctuation, and converts to lowercase to avoid simple bypasses
  public static condense(content: string): string {
    return content.toLowerCase().replace(/[\s\p{P}]+/gu, '');
  }

  public check(guildId: string, userId: string, rawContent: string): number {
    const condensed = AntiDuplicate.condense(rawContent);
    if (condensed.length < 3) return 0; // Ignore tiny messages like "ok", "hi"

    const key = `${guildId}:${userId}`;
    const now = Date.now();
    const record = this.records.get(key);

    if (!record || now - record.lastTimestamp > this.maxWindowMs) {
      this.records.set(key, {
        lastContent: condensed,
        lastTimestamp: now,
        count: 1
      });
      return 1;
    }

    if (record.lastContent === condensed) {
      record.count += 1;
      record.lastTimestamp = now;
      return record.count;
    } else {
      // Content changed
      record.lastContent = condensed;
      record.lastTimestamp = now;
      record.count = 1;
      return 1;
    }
  }

  public clear(guildId: string, userId: string): void {
    this.records.delete(`${guildId}:${userId}`);
  }
}
