import { Listener, container } from '@sapphire/framework';
import { Events, Message } from 'discord.js';

export class MessageCreateListener extends Listener<typeof Events.MessageCreate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.MessageCreate
    });
  }

  public override async run(message: Message) {
    if (!message.guild || message.author.bot) return;

    // Cache message for audit logs
    container.messageCache.put(message);

    // Run AutoMod inspection
    try {
      await container.autoMod.performAutomod(message);
    } catch (err) {
      container.logger.error('[AutoMod] Error inspeccionando mensaje:', err);
    }
  }
}
