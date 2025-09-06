// Require the necessary discord.js classes
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { Logger } from '../utils/logging.js';
import { MessageCreate, MessageUpdate } from './message.events.js';
import ConfigurationFile from 'config';
import { DiscordEvents } from './interfaces.js';
import { prettyZodErrors } from '../utils/zod-errors.js';
import { checkBotPermissions, generateInviteUrl } from './permissions.js';
import * as redis from '../redis.js';
import { DiscordConfigSchema } from '../interfaces/config.js';

const DISCORD_CHANNEL = 'discord';

const intents = [
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.DirectMessageTyping,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageTyping,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.MessageContent,
];

async function setupInternalListener(client: Client, logger: Logger) {
  const redisClient = await redis.clone();

  logger.debug('Subscribing to Redis channel: ' + DISCORD_CHANNEL);
  redisClient.subscribe(DISCORD_CHANNEL, (message: string) => {
    const data = JSON.parse(message) as DiscordEvents;

    switch (data.type) {
      case 'send:channel':
        client.channels.fetch(data.channelId).then(channel => {
          if (channel?.isTextBased() && 'send' in channel) {
            channel.send(data.message);
          }
        });
        break;

      case 'send:user':
        client.users.fetch(data.userId).then(user => {
          user.send(data.message);
        });
        break;

      case 'reply:message':
        client.channels.fetch(data.channelId).then(channel => {
          if (channel?.isTextBased() && 'messages' in channel) {
            channel.messages.fetch(data.messageId).then(message => {
              message.reply(data.message);
            });
          }
        });
        break;
    }
  });
}

function registerEvents(client: Client, logger: Logger) {
  // When the client is ready, run this code (only once).
  client.once(Events.ClientReady, readyClient => {
    logger.info(`Ready! Logged in as ${readyClient.user.tag}`);

    // Check bot permissions in all guilds
    checkBotPermissions(readyClient);

    // Log invite URL for easy permission setup
    logger.debug(`Invite URL: ${generateInviteUrl(readyClient.user.id)}`);
  });

  client.on(Events.MessageCreate, MessageCreate);
  client.on(Events.MessageUpdate, MessageUpdate);
}

export default function initialize() {
  const logger = new Logger('Discord');
  logger.debug('Initializing Discord...');

  const config = ConfigurationFile.get('discord');

  const {
    data: parsedConfig,
    success,
    error,
  } = DiscordConfigSchema.safeParse(config);

  if (!success) {
    logger.error(
      `Invalid Discord config provided - Please correct the errors in your config file (${ConfigurationFile.util.getEnv('NODE_CONFIG_DIR')})`,
    );
    logger.error(prettyZodErrors(error));
    return process.exit();
  }

  if (!parsedConfig.token) {
    logger.error('No Discord token provided');
    return;
  }

  // Create a new client instance
  const client = new Client({ intents });

  registerEvents(client, logger);
  setupInternalListener(client, logger);

  // Log in to Discord with your client's token
  client.login(parsedConfig.token);
}
