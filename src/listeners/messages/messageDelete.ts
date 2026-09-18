import { Listener, container } from '@sapphire/framework';
import { Events, Message, PartialMessage } from 'discord.js';

export class MessageDeleteListener extends Listener<typeof Events.MessageDelete> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.MessageDelete
    });
  }

  public override async run(message: Message | PartialMessage) {
    if (!message.guild) return;

    try {
      const cached = container.messageCache.delete(message.id);
      if (cached) {
        const channelName = 'name' in message.channel ? (message.channel as any).name : 'desconocido';
        await container.guildLogger.logMessageDelete(cached, channelName);
      }
    } catch (err) {
      container.logger.error('[MessageDelete] Error procesando borrado de mensaje:', err);
    }
  }
}
