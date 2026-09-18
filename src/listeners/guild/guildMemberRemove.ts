import { Listener, container } from '@sapphire/framework';
import { Events, GuildMember, PartialGuildMember } from 'discord.js';

export class GuildMemberRemoveListener extends Listener<typeof Events.GuildMemberRemove> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildMemberRemove
    });
  }

  public override async run(member: GuildMember | PartialGuildMember) {
    try {
      await container.guildLogger.logMemberLeave(member);
    } catch (err) {
      container.logger.error('[GuildMemberRemove] Error procesando salida de miembro:', err);
    }
  }
}
