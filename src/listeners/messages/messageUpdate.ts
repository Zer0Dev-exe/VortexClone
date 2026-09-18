import { Listener, container } from '@sapphire/framework';
import { Events, Message, PartialMessage } from 'discord.js';

export class MessageUpdateListener extends Listener<typeof Events.MessageUpdate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.MessageUpdate
    });
  }

  public override async run(oldMsg: Message | PartialMessage, newMsg: Message | PartialMessage) {
    if (!newMsg.guild) return;

    try {
      const fullNewMsg = newMsg.partial ? await newMsg.fetch().catch(() => null) : (newMsg as Message);
      if (!fullNewMsg || fullNewMsg.author?.bot) return;

      const cached = container.messageCache.get(fullNewMsg.id);
      if (cached) {
        await container.guildLogger.logMessageEdit(cached, fullNewMsg);
      }

      // Re-run automod on edited content
      await container.autoMod.performAutomod(fullNewMsg);

      // Update cache with edited message
      container.messageCache.put(fullNewMsg);
    } catch (err) {
      container.logger.error('[MessageUpdate] Error procesando edición de mensaje:', err);
    }
  }
}
