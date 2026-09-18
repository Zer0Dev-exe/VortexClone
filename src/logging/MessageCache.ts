import { Message } from 'discord.js';

export interface CachedMessage {
  id: string;
  guildId: string;
  channelId: string;
  authorId: string;
  authorTag: string;
  content: string;
  attachments: string[];
  createdAt: number;
}

export class MessageCache {
  private cache: Map<string, CachedMessage> = new Map();
  private maxCapacity: number;

  constructor(maxCapacity = 5000) {
    this.maxCapacity = maxCapacity;
  }

  public put(message: Message): void {
    if (!message.guild || message.author?.bot) return;

    if (this.cache.size >= this.maxCapacity) {
      // Evict oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(message.id, {
      id: message.id,
      guildId: message.guild.id,
      channelId: message.channel.id,
      authorId: message.author.id,
      authorTag: message.author.tag,
      content: message.content || '',
      attachments: message.attachments.map(att => att.url),
      createdAt: message.createdTimestamp
    });
  }

  public get(messageId: string): CachedMessage | undefined {
    return this.cache.get(messageId);
  }

  public delete(messageId: string): CachedMessage | undefined {
    const cached = this.cache.get(messageId);
    if (cached) {
      this.cache.delete(messageId);
    }
    return cached;
  }
}
