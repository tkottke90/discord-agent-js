// Require the necessary discord.js classes
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { Logger } from '../utils/logging';
import { MessageCreate, MessageUpdate } from './message.events';
import ConfigurationFile from 'config';
import { DiscordConfigSchema } from './interfaces';
import { prettyZodErrors } from '../utils/zod-errors';

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

  const config = ConfigurationFile.get('discord');

  const { data: parsedConfig, success, error } = DiscordConfigSchema.safeParse(config);

  if (!success) {
    logger.error(`Invalid Discord config provided - Please correct the errors in your config file (${ConfigurationFile.util.getEnv('NODE_CONFIG_DIR')})`);
    logger.error(prettyZodErrors(error));
    return process.exit();
  }

  if (!parsedConfig.token) {
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
  client.login(parsedConfig.token);
}