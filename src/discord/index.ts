// Require the necessary discord.js classes
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { Logger } from '../utils/logging';

export default function initialize() {
  const logger = new Logger('Discord');
  logger.info('Initializing Discord...');

  const token = process.env.DISCORD_TOKEN ?? '';

  if (!token) {
    logger.error('No Discord token provided');
    return;
  }

  // Create a new client instance
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  // When the client is ready, run this code (only once).
  client.once(Events.ClientReady, readyClient => {
    logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
  });

  // Log in to Discord with your client's token
  client.login(token);
}