import { Listener, container } from '@sapphire/framework';
import { Events, GuildMember } from 'discord.js';
import { AutoDehoist } from '../../automod/AutoDehoist.js';

export class GuildMemberAddListener extends Listener<typeof Events.GuildMemberAdd> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildMemberAdd
    });
  }

  public override async run(member: GuildMember) {
    try {
      // 1. Anti-Raid detection
      const kickedByRaid = await container.antiRaid.onMemberJoin(member);
      if (kickedByRaid) return;

      // 2. Auto-Dehoist check
      const am = await container.db.getAutomodSettings(member.guild.id);
      if (am.auto_dehoist) {
        await AutoDehoist.checkAndDehoist(member, am.auto_dehoist);
      }

      // 3. Server audit log
      await container.guildLogger.logMemberJoin(member);
    } catch (err) {
      container.logger.error('[GuildMemberAdd] Error procesando ingreso de miembro:', err);
    }
  }
}
