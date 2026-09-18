import { Listener, container } from '@sapphire/framework';
import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { AutoDehoist } from '../../automod/AutoDehoist.js';

export class GuildMemberUpdateListener extends Listener<typeof Events.GuildMemberUpdate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildMemberUpdate
    });
  }

  public override async run(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    try {
      if (oldMember.displayName !== newMember.displayName) {
        const am = await container.db.getAutomodSettings(newMember.guild.id);
        if (am.auto_dehoist) {
          await AutoDehoist.checkAndDehoist(newMember, am.auto_dehoist);
        }
      }
    } catch (err) {
      container.logger.error('[GuildMemberUpdate] Error comprobando dehoisting en cambio de apodo:', err);
    }
  }
}
