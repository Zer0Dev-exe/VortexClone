import { Listener, container } from '@sapphire/framework';
import { Events, VoiceState } from 'discord.js';

export class VoiceStateUpdateListener extends Listener<typeof Events.VoiceStateUpdate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.VoiceStateUpdate
    });
  }

  public override async run(oldState: VoiceState, newState: VoiceState) {
    try {
      await container.guildLogger.logVoiceStateUpdate(oldState, newState);
    } catch (err) {
      container.logger.error('[VoiceStateUpdate] Error registrando actividad de voz:', err);
    }
  }
}
