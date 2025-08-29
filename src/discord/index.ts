// Require the necessary discord.js classes
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { Logger } from '../utils/logging';
import { MessageCreate, MessageUpdate } from './message.events';

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.DirectMessageTyping
]

export default function initialize() {
  const logger = new Logger('Discord');
  logger.debug('Initializing Discord...');

  const token = process.env.DISCORD_TOKEN ?? '';

  if (!token) {
    logger.error('No Discord token provided');
    return;
  }

  // Create a new client instance
  const client = new Client({ intents });

  // When the client is ready, run this code (only once).
  client.once(Events.ClientReady, readyClient => {
    logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.MessageCreate, MessageCreate);

  client.on(Events.MessageUpdate, MessageUpdate);

  // Log in to Discord with your client's token
  client.login(token);
}