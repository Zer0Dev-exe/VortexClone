import { Listener } from '@sapphire/framework';
import { Events, Client } from 'discord.js';

export class ReadyListener extends Listener<typeof Events.ClientReady> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: Events.ClientReady
    });
  }

  public override run(client: Client<true>) {
    console.log(`✅ [Vortex] Conectado como ${client.user.tag}!`);
    client.user.setActivity('la seguridad del servidor | /help', { type: 3 }); // 3 = WATCHING
  }
}
