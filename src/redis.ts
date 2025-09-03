import redis from 'redis';
import ConfigurationFile from 'config';
import { Logger } from './utils/logging.js';

type CacheConfig = {
  location: string;
  username: string;
  password: string;
  ssl: boolean;
};

let client: redis.RedisClientType = redis.createClient();
const logger = new Logger('Redis');

export async function initialize() {
  logger.debug('Initializing Redis...');
  const config = ConfigurationFile.get<CacheConfig>('cache');

  logger.debug(`Connecting to ${config.location}`);
  client = redis.createClient(config);

  client.on('error', err => logger.error('Redis Error', err));

  await client.connect();

  if (client.isReady) {
    logger.info('Connected to Redis');
  } else {
    logger.error('Failed to connect to Redis');
  }
}

export async function clone() {
  logger.debug('Cloning Redis client...');
  const clonedClient = await client.duplicate();

  await clonedClient.connect();

  return clonedClient;
}
